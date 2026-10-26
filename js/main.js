(function () {
  const images = document.querySelectorAll("img[data-fallback]");

  images.forEach((image) => {
    const tryFallback = () => {
      const fallback = image.getAttribute("data-fallback");

      if (fallback && image.src !== fallback) {
        image.src = fallback;
        return;
      }

      image.classList.add("is-hidden");
    };

    image.addEventListener("error", tryFallback);

    if (image.complete && image.naturalWidth === 0) {
      tryFallback();
    }
  });
})();
