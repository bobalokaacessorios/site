(function () {
  const TOKEN_KEY = "bobaloka-admin-token";
  const config = window.ADMIN_CONFIG || {};
  const loginView = document.getElementById("login-view");
  const editorView = document.getElementById("editor-view");
  const loginStatus = document.getElementById("login-status");
  const editorStatus = document.getElementById("editor-status");
  const setupNote = document.getElementById("setup-note");
  const userLabel = document.getElementById("user-label");

  const emptySocial = { label: "", href: "", icon: "" };
  const emptyButton = { label: "", href: "", icon: "", primary: false };
  const emptyLinha = { src: "", href: "", alt: "" };

  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let sha = "";
  let data = {
    hero: { src: "", alt: "" },
    socials: [],
    buttons: [],
    linhas: [],
  };

  function fromBase64(value) {
    const binary = atob(String(value).replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function toBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function setStatus(node, message, isError) {
    if (!node) {
      return;
    }
    node.textContent = message || "";
    node.classList.toggle("error", Boolean(isError && message));
  }

  function configured() {
    return (
      config.clientId &&
      !config.clientId.includes("YOUR_") &&
      config.oauthBaseUrl &&
      !config.oauthBaseUrl.includes("YOUR_")
    );
  }

  function api(path, options) {
    return fetch("https://api.github.com" + path, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options && options.headers),
      },
    });
  }

  function captureTokenFromHash() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access = hash.get("access_token");
    const error = hash.get("error");
    if (error) {
      setStatus(loginStatus, "Login cancelado ou recusado.", true);
    }
    if (access) {
      token = access;
      sessionStorage.setItem(TOKEN_KEY, token);
      history.replaceState({}, "", window.location.pathname);
    }
  }

  function field(label, key, item, type) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const lab = document.createElement("label");
    lab.textContent = label;
    const input = document.createElement("input");
    input.type = type || "text";
    input.value = item[key] || "";
    input.addEventListener("input", () => {
      item[key] = input.value;
      if (key === "icon" || key === "src") {
        const scope = wrap.closest(".item, .card");
        if (scope) {
          scope.querySelectorAll("img.preview").forEach((img) => {
            img.src = input.value;
          });
        }
      }
    });
    wrap.append(lab, input);
    return wrap;
  }

  function preview(src, round) {
    const img = document.createElement("img");
    img.className = round ? "preview preview-round" : "preview";
    img.alt = "";
    if (src) {
      img.src = src;
    }
    img.addEventListener("error", () => {
      img.removeAttribute("src");
    });
    return img;
  }

  function move(list, index, delta) {
    const next = index + delta;
    if (next < 0 || next >= list.length) {
      return;
    }
    const [item] = list.splice(index, 1);
    list.splice(next, 0, item);
    renderEditor();
  }

  function itemChrome(list, index, title) {
    const head = document.createElement("div");
    head.className = "item-head";
    const name = document.createElement("strong");
    name.textContent = title;
    const actions = document.createElement("div");
    actions.className = "item-actions";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn btn-ghost";
    up.textContent = "Subir";
    up.addEventListener("click", () => move(list, index, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "btn btn-ghost";
    down.textContent = "Descer";
    down.addEventListener("click", () => move(list, index, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-danger";
    remove.textContent = "Remover";
    remove.addEventListener("click", () => {
      list.splice(index, 1);
      renderEditor();
    });

    actions.append(up, down, remove);
    head.append(name, actions);
    return head;
  }

  function renderList(rootId, list, kind) {
    const root = document.getElementById(rootId);
    root.replaceChildren();

    list.forEach((item, index) => {
      const block = document.createElement("div");
      block.className = "item";

      if (kind === "socials") {
        block.append(itemChrome(list, index, item.label || "Rede " + (index + 1)));
        const row = document.createElement("div");
        row.className = "row";
        row.append(preview(item.icon, true), field("URL do ícone", "icon", item, "url"));
        block.append(
          field("Nome", "label", item),
          field("Link", "href", item, "url"),
          row
        );
      }

      if (kind === "buttons") {
        block.append(itemChrome(list, index, item.label || "Botão " + (index + 1)));
        const row = document.createElement("div");
        row.className = "row";
        row.append(preview(item.icon, true), field("URL do ícone", "icon", item, "url"));
        const check = document.createElement("label");
        check.className = "check";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = Boolean(item.primary);
        box.addEventListener("change", () => {
          item.primary = box.checked;
        });
        check.append(box, document.createTextNode("Botão principal"));
        block.append(
          field("Texto", "label", item),
          field("Link", "href", item, "url"),
          row,
          check
        );
      }

      if (kind === "linhas") {
        block.append(itemChrome(list, index, item.alt || "Linha " + (index + 1)));
        const row = document.createElement("div");
        row.className = "row";
        row.append(preview(item.src), field("URL da imagem", "src", item, "url"));
        block.append(
          field("Link", "href", item, "url"),
          field("Texto alternativo", "alt", item),
          row
        );
      }

      root.appendChild(block);
    });
  }

  function renderHero() {
    const card = document.getElementById("hero-card");
    const heading = card.querySelector("h2");
    card.replaceChildren(heading);
    const row = document.createElement("div");
    row.className = "row";
    row.append(
      preview(data.hero.src),
      field("URL da imagem", "src", data.hero, "url")
    );
    card.append(field("Texto alternativo", "alt", data.hero), row);
  }

  function renderEditor() {
    renderHero();
    renderList("socials-list", data.socials, "socials");
    renderList("buttons-list", data.buttons, "buttons");
    renderList("linhas-list", data.linhas, "linhas");
  }

  async function loadContent() {
    const path = encodeURIComponent(config.contentPath).replace(/%2F/g, "/");
    const response = await api(
      "/repos/" + config.owner + "/" + config.repo + "/contents/" + path + "?ref=" + encodeURIComponent(config.branch)
    );
    if (!response.ok) {
      throw new Error("Não foi possível ler data/links.json no repositório.");
    }
    const file = await response.json();
    sha = file.sha;
    const parsed = JSON.parse(fromBase64(file.content));
    data = {
      hero: parsed.hero || { src: "", alt: "" },
      socials: Array.isArray(parsed.socials) ? parsed.socials : [],
      buttons: Array.isArray(parsed.buttons) ? parsed.buttons : [],
      linhas: Array.isArray(parsed.linhas) ? parsed.linhas : [],
    };
  }

  async function saveContent() {
    const path = encodeURIComponent(config.contentPath).replace(/%2F/g, "/");
    const json = JSON.stringify(data, null, 2) + "\n";
    const content = toBase64(json);
    const response = await api(
      "/repos/" + config.owner + "/" + config.repo + "/contents/" + path,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update /links content from admin",
          content,
          sha,
          branch: config.branch,
        }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Falha ao salvar no GitHub.");
    }
    const result = await response.json();
    sha = result.content.sha;
  }

  async function verifyCollaborator() {
    const userRes = await api("/user");
    if (!userRes.ok) {
      throw new Error("Token inválido. Entre novamente.");
    }
    const user = await userRes.json();
    const repoRes = await api("/repos/" + config.owner + "/" + config.repo);
    if (!repoRes.ok) {
      throw new Error("Sem acesso ao repositório " + config.owner + "/" + config.repo + ".");
    }
    const repo = await repoRes.json();
    if (!repo.permissions || !repo.permissions.push) {
      throw new Error("Esta conta não é colaboradora com permissão de escrita.");
    }
    return user.login;
  }

  async function startSession() {
    setStatus(loginStatus, "Verificando acesso...");
    try {
      const login = await verifyCollaborator();
      await loadContent();
      userLabel.textContent = login;
      loginView.classList.add("hidden");
      editorView.classList.remove("hidden");
      renderEditor();
      setStatus(editorStatus, "Conteúdo carregado. As mudanças vão para data/links.json.");
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      token = "";
      loginView.classList.remove("hidden");
      editorView.classList.add("hidden");
      setStatus(loginStatus, error.message, true);
    }
  }

  document.getElementById("login-btn").addEventListener("click", () => {
    if (!configured()) {
      setupNote.classList.remove("hidden");
      setStatus(loginStatus, "OAuth ainda não está configurado.", true);
      return;
    }
    const redirect = window.location.origin + window.location.pathname;
    const url = config.oauthBaseUrl.replace(/\/$/, "") + "/login?redirect=" + encodeURIComponent(redirect);
    window.location.href = url;
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    token = "";
    window.location.href = window.location.pathname;
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    const button = document.getElementById("save-btn");
    button.disabled = true;
    setStatus(editorStatus, "Salvando...");
    try {
      await saveContent();
      setStatus(editorStatus, "Salvo. O GitHub Pages pode levar um minuto para atualizar /links.");
    } catch (error) {
      setStatus(editorStatus, error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.getAttribute("data-add");
      if (kind === "socials") {
        data.socials.push({ ...emptySocial });
      }
      if (kind === "buttons") {
        data.buttons.push({ ...emptyButton });
      }
      if (kind === "linhas") {
        data.linhas.push({ ...emptyLinha });
      }
      renderEditor();
    });
  });

  captureTokenFromHash();
  if (!configured()) {
    setupNote.classList.remove("hidden");
  }
  if (token) {
    startSession();
  }
})();
