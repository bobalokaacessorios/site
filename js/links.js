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
      const href = new URL(item.href, window.location.href);
      const isInternal = href.origin === window.location.origin;

      root.appendChild(
        createEl(
          "a",
          {
            class: item.primary ? "btn btn-primary" : "btn btn-ghost",
            href: item.href,
            target: isInternal ? null : "_blank",
            rel: isInternal ? null : "noopener noreferrer",
          },
          [icon, createEl("span", { text: item.label }), chevron]
        )
      );
    });
    root.hidden = root.childElementCount === 0;
  }

  function rowSizes(n) {
    if (n <= 0) {
      return [];
    }
    if (n < 3) {
      return [n];
    }

    const fours = Math.floor(n / 4);
    const remainder = n % 4;

    if (remainder === 0) {
      return Array(fours).fill(4);
    }
    if (remainder === 1) {
      return Array(fours - 1).fill(4).concat(5);
    }
    if (remainder === 2) {
      return Array(fours - 1).fill(4).concat(3, 3);
    }
    return Array(fours).fill(4).concat(3);
  }

  function makeLinhaTile(item, index) {
    return createEl(
      "a",
      {
        class: "tile t" + ((index % 4) + 1),
        href: item.href,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": item.alt || "Conheça nossas Linhas",
      },
      [createEl("img", { src: item.src, alt: "" })]
    );
  }

  function renderLinhas(linhas) {
    const root = document.getElementById("mosaic");
    if (!root) {
      return;
    }

    const items = (linhas || []).filter(
      (item) => isSafeUrl(item.href) && isSafeUrl(item.src)
    );

    root.replaceChildren();
    const sizes = rowSizes(items.length);
    let offset = 0;

    sizes.forEach((count) => {
      const columns = count < 3 ? 4 : count;
      const row = createEl("div", {
        class: "mosaic-row mosaic-row-" + columns,
      });
      items.slice(offset, offset + count).forEach((item, index) => {
        row.appendChild(makeLinhaTile(item, offset + index));
      });
      root.appendChild(row);
      offset += count;
    });

    const section = root.closest(".linhas");
    if (section) {
      section.hidden = items.length === 0;
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
