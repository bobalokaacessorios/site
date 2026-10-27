const ALLOWED_HOSTS = ["bobaloka.com.br", "127.0.0.1", "localhost"];

function isAllowedRedirect(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return ALLOWED_HOSTS.includes(url.hostname) && path === "/links/admin";
  } catch (error) {
    return false;
  }
}

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

function isSafePreviewUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !isPrivateHost(url.hostname);
  } catch (error) {
    return false;
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstImageFromHtml(html, baseUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        return new URL(decodeHtml(match[1]).trim(), baseUrl).href;
      } catch (error) {
        continue;
      }
    }
  }
  return "";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/preview") {
      const target = url.searchParams.get("url");
      if (!isSafePreviewUrl(target)) {
        return Response.json({ error: "URL inválida." }, { status: 400, headers: corsHeaders() });
      }
      try {
        const response = await fetch(target, {
          redirect: "follow",
          headers: { "User-Agent": "BobalokaCatalogPreview/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const html = (await response.text()).slice(0, 800000);
        const src = firstImageFromHtml(html, response.url || target);
        return Response.json({ src }, { headers: corsHeaders() });
      } catch (error) {
        return Response.json({ error: "Falha ao ler o catálogo." }, { status: 502, headers: corsHeaders() });
      }
    }

    if (url.pathname === "/login") {
      const redirect = url.searchParams.get("redirect");
      if (!isAllowedRedirect(redirect)) {
        return new Response("Redirect inválido.", { status: 400 });
      }

      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorize.searchParams.set("scope", "repo");
      authorize.searchParams.set("redirect_uri", new URL("/callback", url.origin).href);
      authorize.searchParams.set("state", redirect);
      return Response.redirect(authorize.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !isAllowedRedirect(state)) {
        return new Response("Callback inválido.", { status: 400 });
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const payload = await tokenResponse.json();
      const dest = new URL(state);
      dest.hash = payload.access_token
        ? "access_token=" + encodeURIComponent(payload.access_token)
        : "error=" + encodeURIComponent(payload.error || "oauth_failed");
      return Response.redirect(dest.toString(), 302);
    }

    return new Response("Bobaloka OAuth proxy", { status: 200 });
  },
};
