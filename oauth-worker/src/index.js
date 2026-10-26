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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
