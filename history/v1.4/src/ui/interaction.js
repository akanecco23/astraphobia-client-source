function simulateTyping(selector, text) {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  }
  element.focus();
  element.value = "";
  let currentIndex = 0;
  const typeText = () => {
    if (currentIndex >= text.length) {
      element.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );
      element.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
      setTimeout(() => {}, 100);
      return;
    }
    element.value += text[currentIndex];
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
      }),
    );
    currentIndex++;
    setTimeout(typeText, 25);
  };
  typeText();
  return true;
}
function showNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: var(--bg-primary); color: var(--text-primary); padding: 12px 18px; border-radius: 12px; z-index: 10001; font-size: 14px; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none; backdrop-filter: blur(10px); border: 1px solid var(--border);";
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  setTimeout(() => {
    notificationDiv.style.opacity = "1";
    notificationDiv.style.transform = "translateY(0)";
  }, 10);
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    notificationDiv.style.transform = "translateY(-10px)";
    setTimeout(() => notificationDiv.remove(), 300);
  }, 3000);
}

export { simulateTyping, showNotification };
