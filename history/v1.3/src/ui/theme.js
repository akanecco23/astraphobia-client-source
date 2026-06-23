function initBackgroundImage() {
  const backgroundUrl = localStorage.getItem("bgUrl") || "";
  if (backgroundUrl === "") {
    return;
  }
  let homeBgElement = document.querySelector(".home-bg");
  const applyBackgroundImage = () => {
    homeBgElement.style.setProperty(
      "background-image",
      'url("' + backgroundUrl + '")',
      "important",
    );
  };
  if (!homeBgElement) {
    const elementCheckInterval = setInterval(() => {
      homeBgElement = document.querySelector(".home-bg");
      if (homeBgElement != null) {
        clearInterval(elementCheckInterval);
        applyBackgroundImage();
      }
    }, 100);
  } else {
    applyBackgroundImage();
  }
}

export { initBackgroundImage };
