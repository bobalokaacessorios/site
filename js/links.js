(function () {
  const DATA_URL = new URL("../data/links.json", window.location.href).href;

  function isSafeUrl(value) {
    if (!value || typeof value !== "string") {
      return false;
    }

    try {
      const url = new URL(value, window.location.href);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function createEl(tag, attrs, children) {
    const node = document.createElement(tag);

    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null || value === false) {
        return;
      }
      if (key === "text") {
        node.textContent = value;
        return;
      }
      node.setAttribute(key, value === true ? "" : value);
    });

    (children || []).forEach((child) => {
      if (child) {
        node.appendChild(child);
      }
    });

    return node;
  }

  function renderHero(hero) {
    const img = document.getElementById("hero-image");
    if (!img || !hero || !isSafeUrl(hero.src)) {
      return;
    }
    img.src = hero.src;
    img.alt = hero.alt || "Fachada da loja Bobaloka Acessórios";
  }

  function renderSocials(socials) {
    const root = document.getElementById("socials");
    if (!root) {
      return;
    }

    root.replaceChildren();
    (socials || []).forEach((item) => {
      if (!isSafeUrl(item.href) || !isSafeUrl(item.icon)) {
        return;
      }

      root.appendChild(
        createEl(
          "a",
          {
            href: item.href,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": item.label || "Rede social",
          },
          [createEl("img", { src: item.icon, alt: "" })]
        )
      );
    });
    root.hidden = root.childElementCount === 0;
  }

  function renderButtons(buttons) {
    const root = document.getElementById("buttons");
    if (!root) {
      return;
    }

    root.replaceChildren();
    (buttons || []).forEach((item) => {
      if (!item.label || !isSafeUrl(item.href)) {
        return;
      }

      const icon = isSafeUrl(item.icon)
        ? createEl("img", { class: "ico", src: item.icon, alt: "" })
        : null;
      const chevron = createEl("img", {
        class: "chev",
        src: "../assets/icons/chevron.svg",
        alt: "",
      });

      root.appendChild(
        createEl(
          "a",
          {
            class: item.primary ? "btn btn-primary" : "btn btn-ghost",
            href: item.href,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          [icon, createEl("span", { text: item.label }), chevron]
        )
      );
    });
    root.hidden = root.childElementCount === 0;
  }

  function renderLinhas(linhas) {
    const root = document.getElementById("mosaic");
    if (!root) {
      return;
    }

    root.replaceChildren();
    (linhas || []).forEach((item, index) => {
      if (!isSafeUrl(item.href) || !isSafeUrl(item.src)) {
        return;
      }

      const tone = "t" + ((index % 4) + 1);
      root.appendChild(
        createEl(
          "a",
          {
            class: "tile " + tone,
            href: item.href,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": item.alt || "Conheça nossas Linhas",
          },
          [createEl("img", { src: item.src, alt: "" })]
        )
      );
    });
    const section = root.closest(".linhas");
    if (section) {
      section.hidden = root.childElementCount === 0;
    }
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Não foi possível carregar os links.");
      }
      return response.json();
    })
    .then((data) => {
      renderHero(data.hero);
      renderSocials(data.socials);
      renderButtons(data.buttons);
      renderLinhas(data.linhas);
    })
    .catch(() => {
      const panel = document.querySelector(".panel-inner");
      if (panel) {
        const note = createEl("p", {
          class: "foot",
          text: "Não foi possível carregar os links agora.",
        });
        panel.appendChild(note);
      }
    });
})();
