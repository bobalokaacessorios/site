(function () {
  const DATA_URL = new URL("../../data/catalogos.json", window.location.href).href;

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

  function resolveUrl(value) {
    return new URL(value, window.location.href).href;
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

  function renderGroups(groups) {
    const root = document.getElementById("catalog-groups");
    if (!root) {
      return;
    }

    root.replaceChildren();
    (groups || []).forEach((group) => {
      const items = (group.items || []).filter((item) => isSafeUrl(item.href));
      if (!items.length) {
        return;
      }

      const grid = createEl("div", {
        class: "catalog-grid",
        "data-count": String(items.length),
      });

      items.forEach((item) => {
        grid.appendChild(
          createEl(
            "a",
            {
              class: "catalog-card",
              href: resolveUrl(item.href),
              target: "_blank",
              rel: "noopener noreferrer",
            },
            [
              isSafeUrl(item.src)
                ? createEl("img", {
                    src: resolveUrl(item.src),
                    alt: "",
                  })
                : null,
              createEl("span", { text: item.title || "Catálogo" }),
            ]
          )
        );
      });

      const section = createEl("section", { class: "catalog-group catalog-group-" + (group.id || "") }, [
        createEl("h2", { text: group.title || "Catálogos" }),
        group.subtitle ? createEl("p", { class: "catalog-subtitle", text: group.subtitle }) : null,
        grid,
      ]);
      if (group.color) {
        section.style.setProperty("--line-color", group.color);
      }
      root.appendChild(section);
    });
  }

  function renderContact(contact) {
    const root = document.getElementById("catalog-contact");
    if (!root || !contact || !isSafeUrl(contact.href)) {
      return;
    }

    const icon = createEl("img", {
      class: "ico",
      src: new URL("../../assets/icons/whatsapp.svg", window.location.href).href,
      alt: "",
    });
    const chevron = createEl("img", {
      class: "chev",
      src: new URL("../../assets/icons/chevron.svg", window.location.href).href,
      alt: "",
    });

    root.replaceChildren(
      createEl(
        "a",
        {
          class: "btn btn-primary",
          href: resolveUrl(contact.href),
          target: "_blank",
          rel: "noopener noreferrer",
        },
        [icon, createEl("span", { text: contact.label || "Fale conosco" }), chevron]
      )
    );

    (contact.hours || []).forEach((line) => {
      root.appendChild(createEl("p", { class: "catalog-hours", text: line }));
    });
    root.hidden = false;
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Não foi possível carregar os catálogos.");
      }
      return response.json();
    })
    .then((data) => {
      renderGroups(data.groups);
      renderContact(data.contact);
    })
    .catch(() => {
      const panel = document.querySelector(".panel-inner");
      if (panel) {
        panel.appendChild(
          createEl("p", {
            class: "foot",
            text: "Não foi possível carregar os catálogos agora.",
          })
        );
      }
    });
})();
