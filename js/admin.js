(function () {
  const TOKEN_KEY = "bobaloka-admin-token";
  const config = window.ADMIN_CONFIG || {};
  const loginView = document.getElementById("login-view");
  const editorView = document.getElementById("editor-view");
  const loginStatus = document.getElementById("login-status");
  const editorStatus = document.getElementById("editor-status");
  const setupNote = document.getElementById("setup-note");
  const userLabel = document.getElementById("user-label");
  const LINE_COLORS = ["#F6C660", "#D85E40", "#EB74A7", "#1e3a2f"];

  const emptySocial = { label: "", href: "", icon: "" };
  const emptyButton = { label: "", href: "", icon: "", primary: false };
  const emptyLinha = { src: "", href: "", alt: "" };
  const emptyCatalogItem = { title: "", src: "", href: "" };

  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let activeTab = "links";
  let sha = "";
  let catalogosSha = "";
  let data = {
    hero: { src: "", alt: "" },
    socials: [],
    buttons: [],
    linhas: [],
  };
  let catalogos = {
    contact: {
      href: "https://wa.me/message/WSMJNMSPPYQ3F1",
      label: "Fale com nossas vendedoras",
      hours: ["Seg a sexta: 9:30 às 17:00", "Sábado: 9:00 às 13:00"],
    },
    groups: [],
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

  function contentsPath(filePath) {
    return encodeURIComponent(filePath).replace(/%2F/g, "/");
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  const IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
        updatePreview(wrap, input.value);
      }
    });
    wrap.append(lab, input);
    return wrap;
  }

  function updatePreview(scopeStart, src) {
    const scope = scopeStart && scopeStart.closest(".item, .card");
    if (!scope) {
      return;
    }
    scope.querySelectorAll("img.preview").forEach((img) => {
      if (src) {
        img.src = src;
      } else {
        img.removeAttribute("src");
      }
    });
  }

  function fileExtension(file) {
    const fromName = String(file.name || "").match(/\.(jpe?g|png|webp|gif|svg)$/i);
    if (fromName) {
      return fromName[0].toLowerCase().replace(".jpeg", ".jpg");
    }
    return IMAGE_TYPES[file.type] || "";
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }

  async function uploadAsset(file, folder) {
    if (!file) {
      throw new Error("Escolha uma imagem.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }
    const ext = fileExtension(file) || IMAGE_TYPES[file.type] || "";
    if (!ext) {
      throw new Error("Use JPG, PNG, WebP, GIF ou SVG.");
    }
    const base = slug(String(file.name || "").replace(/\.[^.]+$/, "")) || "imagem";
    const fileName = base + "-" + Date.now() + ext;
    const repoPath = folder + "/" + fileName;
    const content = await fileToBase64(file);
    const response = await api(
      "/repos/" + config.owner + "/" + config.repo + "/contents/" + contentsPath(repoPath),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Add " + repoPath + " from admin",
          content,
          branch: config.branch,
        }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Falha ao enviar a imagem para o GitHub.");
    }
    const result = await response.json();
    const path = "../../" + repoPath;
    return {
      path,
      previewUrl: (result.content && result.content.download_url) || path,
    };
  }

  function imageField(label, key, item) {
    const wrap = field(label, key, item, "url");
    wrap.classList.add("field-image");
    const input = wrap.querySelector("input");
    if (key === "src") {
      input.setAttribute("data-key", "src");
    }

    const controls = document.createElement("div");
    controls.className = "field-image-controls";
    input.replaceWith(controls);
    controls.appendChild(input);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = Object.keys(IMAGE_TYPES).join(",");
    fileInput.setAttribute("aria-label", "Carregar imagem");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-ghost";
    button.textContent = "Carregar imagem";
    button.addEventListener("click", () => fileInput.click());

    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = "Ou envie um arquivo; ele vai para o GitHub e o caminho é preenchido aqui.";

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) {
        return;
      }
      button.disabled = true;
      hint.textContent = "Enviando para o GitHub...";
      const localUrl = URL.createObjectURL(file);
      updatePreview(wrap, localUrl);
      try {
        const uploaded = await uploadAsset(file, key === "icon" ? "assets/icons" : "assets/images");
        item[key] = uploaded.path;
        input.value = uploaded.path;
        updatePreview(wrap, uploaded.previewUrl);
        hint.textContent = "Imagem enviada. O GitHub Pages pode levar um minuto para atualizar.";
        setStatus(editorStatus, "Imagem enviada para o GitHub.");
      } catch (error) {
        updatePreview(wrap, item[key] || "");
        hint.textContent = error.message || "Falha ao enviar a imagem.";
        setStatus(editorStatus, error.message || "Falha ao enviar a imagem.", true);
      } finally {
        URL.revokeObjectURL(localUrl);
        button.disabled = false;
      }
    });

    controls.append(button, fileInput);
    wrap.appendChild(hint);
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

  async function fetchCatalogThumb(href) {
    if (!href || !config.oauthBaseUrl) {
      return "";
    }
    const endpoint =
      config.oauthBaseUrl.replace(/\/$/, "") +
      "/preview?url=" +
      encodeURIComponent(href);
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error("Não foi possível ler a capa desse catálogo.");
    }
    const payload = await response.json();
    return payload.src || "";
  }

  function catalogLinkField(item) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const lab = document.createElement("label");
    lab.textContent = "Link do catálogo";
    const input = document.createElement("input");
    input.type = "url";
    input.value = item.href || "";
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = "A miniatura usa a URL da capa. Se estiver vazia, tentamos a primeira imagem do catálogo.";

    let timer = 0;
    const applyThumb = async () => {
      item.href = input.value.trim();
      if (!item.href || item.src) {
        return;
      }
      hint.textContent = "Buscando a primeira imagem...";
      try {
        const src = await fetchCatalogThumb(item.href);
        const unusable = /static\.canva\.com\/static\/images\/fb_cover/i.test(src);
        if (src && !unusable) {
          item.src = src;
          const scope = wrap.closest(".item");
          if (scope) {
            scope.querySelectorAll("img.preview").forEach((img) => {
              img.src = src;
            });
            const srcInput = scope.querySelector('input[data-key="src"]');
            if (srcInput) {
              srcInput.value = src;
            }
          }
          hint.textContent = "Capa preenchida com a primeira imagem do catálogo.";
        } else {
          hint.textContent = "Não achei a capa nesse link. Cole a URL da capa abaixo.";
        }
      } catch (error) {
        hint.textContent = error.message || "Não foi possível ler a capa desse catálogo.";
      }
    };

    input.addEventListener("input", () => {
      item.href = input.value.trim();
      window.clearTimeout(timer);
      timer = window.setTimeout(applyThumb, 700);
    });
    input.addEventListener("blur", applyThumb);
    wrap.append(lab, input, hint);
    return wrap;
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
        row.append(preview(item.icon, true), imageField("URL do ícone", "icon", item));
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
        row.append(preview(item.icon, true), imageField("URL do ícone", "icon", item));
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
        row.append(preview(item.src), imageField("URL da imagem", "src", item));
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
      imageField("URL da imagem", "src", data.hero)
    );
    card.append(field("Texto alternativo", "alt", data.hero), row);
  }

  function renderCatalogContact() {
    const root = document.getElementById("catalog-contact-fields");
    if (!root) {
      return;
    }
    if (!catalogos.contact) {
      catalogos.contact = {
        href: "",
        label: "",
        hours: [],
      };
    }
    const hoursBox = document.createElement("div");
    hoursBox.className = "field";
    const hoursLabel = document.createElement("label");
    hoursLabel.textContent = "Horários (um por linha)";
    const hours = document.createElement("textarea");
    hours.value = (catalogos.contact.hours || []).join("\n");
    hours.addEventListener("input", () => {
      catalogos.contact.hours = hours.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    });
    hoursBox.append(hoursLabel, hours);
    root.replaceChildren(
      field("Texto do botão", "label", catalogos.contact),
      field("Link do WhatsApp", "href", catalogos.contact, "url"),
      hoursBox
    );
  }

  function renderCatalogItem(group, item, index) {
    const block = document.createElement("div");
    block.className = "item";
    block.append(itemChrome(group.items, index, item.title || "Catálogo " + (index + 1)));
    const row = document.createElement("div");
    row.className = "row";
    row.append(preview(item.src), imageField("URL da capa", "src", item));
    block.append(field("Título", "title", item), catalogLinkField(item), row);
    return block;
  }

  function renderCatalogGroups() {
    const root = document.getElementById("catalog-groups-list");
    if (!root) {
      return;
    }
    root.replaceChildren();
    catalogos.groups.forEach((group, index) => {
      if (!Array.isArray(group.items)) {
        group.items = [];
      }
      const card = document.createElement("section");
      card.className = "card";
      const colorWrap = document.createElement("div");
      colorWrap.className = "field";
      const colorLabel = document.createElement("label");
      colorLabel.textContent = "Cor da faixa";
      const colorRow = document.createElement("div");
      colorRow.className = "color-field";
      const color = document.createElement("input");
      color.type = "color";
      color.value = /^#([0-9a-f]{6})$/i.test(group.color || "") ? group.color : "#F6C660";
      color.addEventListener("input", () => {
        group.color = color.value;
      });
      colorRow.append(color);
      colorWrap.append(colorLabel, colorRow);

      const list = document.createElement("div");
      group.items.forEach((item, itemIndex) => {
        list.appendChild(renderCatalogItem(group, item, itemIndex));
      });

      const add = document.createElement("div");
      add.className = "card-actions";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-ghost";
      addBtn.textContent = "Adicionar catálogo";
      addBtn.addEventListener("click", () => {
        group.items.push({ ...emptyCatalogItem });
        renderEditor();
      });
      add.appendChild(addBtn);

      card.append(
        itemChrome(catalogos.groups, index, group.title || "Linha " + (index + 1)),
        field("Título", "title", group),
        field("Subtítulo", "subtitle", group),
        colorWrap,
        list,
        add
      );
      root.appendChild(card);
    });
  }

  function setTab(tab) {
    activeTab = tab;
    document.getElementById("tab-links").classList.toggle("hidden", tab !== "links");
    document.getElementById("tab-catalogos").classList.toggle("hidden", tab !== "catalogos");
    document.querySelectorAll(".admin-tabs .tab").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-tab") === tab);
    });
  }

  function renderEditor() {
    renderHero();
    renderList("socials-list", data.socials, "socials");
    renderList("buttons-list", data.buttons, "buttons");
    renderList("linhas-list", data.linhas, "linhas");
    renderCatalogContact();
    renderCatalogGroups();
  }

  async function loadFile(filePath) {
    const response = await api(
      "/repos/" +
        config.owner +
        "/" +
        config.repo +
        "/contents/" +
        contentsPath(filePath) +
        "?ref=" +
        encodeURIComponent(config.branch)
    );
    if (!response.ok) {
      throw new Error("Não foi possível ler " + filePath + " no repositório.");
    }
    return response.json();
  }

  async function saveFile(filePath, payload, currentSha, message) {
    const response = await api(
      "/repos/" + config.owner + "/" + config.repo + "/contents/" + contentsPath(filePath),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: toBase64(JSON.stringify(payload, null, 2) + "\n"),
          sha: currentSha,
          branch: config.branch,
        }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Falha ao salvar " + filePath + ".");
    }
    const result = await response.json();
    return result.content.sha;
  }

  async function loadContent() {
    const linksFile = await loadFile(config.contentPath);
    sha = linksFile.sha;
    const parsed = JSON.parse(fromBase64(linksFile.content));
    data = {
      hero: parsed.hero || { src: "", alt: "" },
      socials: Array.isArray(parsed.socials) ? parsed.socials : [],
      buttons: Array.isArray(parsed.buttons) ? parsed.buttons : [],
      linhas: Array.isArray(parsed.linhas) ? parsed.linhas : [],
    };

    const catalogosFile = await loadFile(config.catalogosPath || "data/catalogos.json");
    catalogosSha = catalogosFile.sha;
    const catalogParsed = JSON.parse(fromBase64(catalogosFile.content));
    catalogos = {
      contact: catalogParsed.contact || catalogos.contact,
      groups: Array.isArray(catalogParsed.groups) ? catalogParsed.groups : [],
    };
  }

  async function saveContent() {
    catalogos.groups.forEach((group, index) => {
      group.id = slug(group.title) || "linha-" + (index + 1);
      if (!group.color) {
        group.color = LINE_COLORS[index % LINE_COLORS.length];
      }
    });
    sha = await saveFile(config.contentPath, data, sha, "Update /links content from admin");
    catalogosSha = await saveFile(
      config.catalogosPath || "data/catalogos.json",
      catalogos,
      catalogosSha,
      "Update /links/catalogos content from admin"
    );
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
      setStatus(editorStatus, "Conteúdo carregado. As mudanças vão para o GitHub.");
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
      setStatus(editorStatus, "Salvo. O GitHub Pages pode levar um minuto para atualizar.");
    } catch (error) {
      setStatus(editorStatus, error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.getAttribute("data-tab")));
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
      if (kind === "catalog-group") {
        catalogos.groups.push({
          id: "",
          title: "",
          subtitle: "",
          color: LINE_COLORS[catalogos.groups.length % LINE_COLORS.length],
          items: [],
        });
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
