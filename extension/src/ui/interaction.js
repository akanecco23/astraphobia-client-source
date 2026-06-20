import { getGameCanvas } from './radar.js';
import { state } from '../core.js';
import { uiaudioState } from './audio.js';
import { simulatePointerMove } from '../features/movement.js';
import { toggleLock } from '../features/aimbot.js';

function simulateTextInput(selector, textToType) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let currentIndex = 0;
  const typeNextCharacter = () => {
    if (currentIndex >= textToType.length) {
      inputElement.dispatchEvent(new Event("change", {
        bubbles: true
      }));
      inputElement.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      return;
    }
    inputElement.value += textToType[currentIndex];
    inputElement.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    currentIndex++;
    setTimeout(typeNextCharacter, 25);
  };
  typeNextCharacter();
  return true;
}
let currentValue = "";
function showNotification(message) {
  const notificationTime = Date.now();
  if (message === currentValue && notificationTime - state.currentTime < 3000) {
    return;
  }
  currentValue = message;
  state.currentTime = notificationTime;
  const notificationElement = document.createElement("div");
  notificationElement.style.cssText = "\n      position: fixed; top: 16px; right: 16px;\n      background: var(--notif-bg, #282828); color: var(--notif-text, #e0e0e0);\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--notif-border, var(--acc, #888));\n      transform: translateX(20px);\n    ";
  notificationElement.textContent = message;
  document.body.appendChild(notificationElement);
  requestAnimationFrame(() => {
    notificationElement.style.opacity = "1";
    notificationElement.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    notificationElement.style.opacity = "0";
    notificationElement.style.transform = "translateX(20px)";
    setTimeout(() => notificationElement.remove(), 200);
  }, 2500);
}
function initAutofillName() {
  if (uiaudioState.isMuted) {
    return;
  }
  let savedName = localStorage.getItem("autofill_name") || "";
  let nameInput = document.querySelector(".name-input input") || document.querySelector(".play-game .el-input__inner");
  function applyAutofill() {
    if (uiaudioState.isMuted) {
      return;
    }
    uiaudioState.isMuted = true;
    nameInput.value = savedName;
    nameInput.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    nameInput.addEventListener("input", () => {
      if (savedName !== nameInput.value) {
        savedName = nameInput.value;
        localStorage.setItem("autofill_name", savedName);
      }
    });
  }
  if (nameInput == null) {
    const inputCheckInterval = setInterval(() => {
      nameInput = document.querySelector(".name-input input") || document.querySelector(".play-game .el-input__inner");
      if (nameInput != null) {
        clearInterval(inputCheckInterval);
        applyAutofill();
      }
    }, 200);
  } else {
    applyAutofill();
  }
}
function typeChatMessage(messageText) {
  const chatInputElement = document.querySelector(".chat-input input") || document.querySelector("input[placeholder*=\"chat\" i]") || document.querySelector("input[type=\"text\"]");
  if (!chatInputElement) {
    return;
  }
  chatInputElement.focus();
  chatInputElement.value = "";
  let charIndex = 0;
  const typeNextCharacter = () => {
    if (charIndex >= messageText.length) {
      const sendButton = document.querySelector(".chat-input button") || document.querySelector("button[aria-label*=\"send\" i]");
      if (sendButton) {
        sendButton.click();
      } else {
        chatInputElement.dispatchEvent(new Event("change", {
          bubbles: true
        }));
        chatInputElement.dispatchEvent(new Event("input", {
          bubbles: true
        }));
        setTimeout(() => {
          chatInputElement.value = "";
          chatInputElement.blur();
        }, 100);
      }
      return;
    }
    chatInputElement.value += messageText[charIndex];
    chatInputElement.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    charIndex++;
    setTimeout(typeNextCharacter, 25);
  };
  typeNextCharacter();
}
let isInitialized = false;
function initializeTextInterceptor() {
  if (isInitialized) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(/\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g, (context, octalValue, hexValue1, hexValue2, hexValue3) => {
      switch (octalValue[0]) {
        case "\\":
          return "\\";
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "v":
          return "";
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
          return String.fromCharCode(Number.parseInt(octalValue, 8) || 0);
        default:
          if (hexValue1 != null) {
            return String.fromCharCode(Number.parseInt(hexValue1, 16) || 0);
          }
          if (hexValue2 != null) {
            return String.fromCharCode(Number.parseInt(hexValue2, 16) || 0);
          }
          if (hexValue3 != null) {
            const codePoint = Number.parseInt(hexValue3, 16) || 0;
            if (codePoint > 1114111) {
              return context;
            } else {
              return String.fromCodePoint(codePoint);
            }
          }
          return octalValue;
      }
    });
  }
  const actionCodes = {
    spawn: 22,
    createTribe: 5,
    chat: 100
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputData) {
    try {
      const patternList = [/^(\x14{3}\d+\|6\|)(.+)$/gm, /^(\x14{3}\d+\|8\|)(.+)$/gm, /^(\x14{3}\d+\|14\|)(.+)$/gm, /^(\x13{3}[01])(.+)$/gm];
      for (let patternIndex = 0; patternIndex < patternList.length; patternIndex++) {
        const regexMatch = patternList[patternIndex].exec(inputData[0]);
        if (regexMatch && regexMatch.length === 3) {
          const actionMethod = [actionCodes.spawn, actionCodes.spawn, actionCodes.createTribe, actionCodes.chat][patternIndex];
          inputData[0] = regexMatch[1] + unescapeString(regexMatch[2]).substr(0, actionMethod);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputData);
  };
  const currentTimestamp = new MutationObserver(() => {
    document.querySelector(".play-game .el-input__inner")?.setAttribute("maxlength", "80");
    document.querySelector(".new-tribe .el-input__inner")?.setAttribute("maxlength", "20");
    document.querySelector(".chat-input input")?.setAttribute("maxLength", "1000");
  });
  currentTimestamp.observe(document.body, {
    childList: true,
    subtree: true
  });
  isInitialized = true;
  showNotification("Special characters enabled");
}
function simulateClick(clientX, clientY) {
  const targetElement = getGameCanvas();
  if (!targetElement) {
    return;
  }
  targetElement.dispatchEvent(new PointerEvent("pointerdown", {
    clientX: clientX,
    clientY: clientY,
    button: 0,
    buttons: 1,
    bubbles: true,
    view: window
  }));
  setTimeout(() => {
    targetElement.dispatchEvent(new PointerEvent("pointerup", {
      clientX: clientX,
      clientY: clientY,
      buttons: 0,
      bubbles: true,
      view: window
    }));
  }, 80);
}
function showHalloweenCodeModal(onUnlockCallback) {
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
  modalOverlay.innerHTML = "<div style=\"background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;\">\n      <div style=\"color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;\">Halloween Access Code</div>\n      <input id=\"hwCodeInput\" type=\"text\" placeholder=\"Enter code...\" style=\"background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;\">\n      <div style=\"display:flex;gap:8px;\">\n        <button id=\"hwCancelBtn\" style=\"flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;\">Cancel</button>\n        <button id=\"hwSubmitBtn\" style=\"flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-weight:600;\">Redeem</button>\n      </div></div>";
  document.body.appendChild(modalOverlay);
  setTimeout(() => {
    modalOverlay.style.opacity = "1";
  }, 10);
  const codeInput = modalOverlay.querySelector("#hwCodeInput");
  const closeModal = () => {
    modalOverlay.style.opacity = "0";
    setTimeout(() => modalOverlay.remove(), 300);
  };
  modalOverlay.querySelector("#hwSubmitBtn").onclick = () => {
    const inputValue = codeInput.value.trim();
    if (inputValue === "HappyHalloween9" || inputValue === "TrickOrTreat9") {
      localStorage.setItem("halloweenUnlocked", "true");
      showNotification("Halloween theme unlocked");
      closeModal();
      onUnlockCallback(true);
    } else {
      codeInput.style.borderColor = "#ff0000";
      setTimeout(() => {
        codeInput.style.borderColor = "#333";
      }, 500);
      showNotification("Invalid code");
    }
  };
  modalOverlay.querySelector("#hwCancelBtn").onclick = () => {
    closeModal();
    onUnlockCallback(false);
  };
  codeInput.addEventListener("keypress", event => {
    if (event.key === "Enter") {
      modalOverlay.querySelector("#hwSubmitBtn").click();
    }
  });
  codeInput.focus();
}
function makeElementDraggable(draggableElement) {
  let offsetX;
  let offsetY;
  let isDragging = false;
  let hasMoved = false;
  draggableElement.addEventListener("mousedown", event => {
    if (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"].includes(event.target.tagName)) {
      return;
    }
    if (event.target.closest("button,input,textarea,select,label")) {
      return;
    }
    isDragging = true;
    hasMoved = false;
    offsetX = event.clientX - draggableElement.getBoundingClientRect().left;
    offsetY = event.clientY - draggableElement.getBoundingClientRect().top;
    draggableElement.style.transition = "none";
    const handleMouseMove = currentMouseEvent => {
      if (!hasMoved && (Math.abs(currentMouseEvent.clientX - event.clientX) > 5 || Math.abs(currentMouseEvent.clientY - event.clientY) > 5)) {
        hasMoved = true;
      }
      if (isDragging) {
        draggableElement.style.left = currentMouseEvent.clientX - offsetX + "px";
        draggableElement.style.top = currentMouseEvent.clientY - offsetY + "px";
        draggableElement.style.bottom = "auto";
        draggableElement.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      draggableElement.style.transition = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  draggableElement.addEventListener("click", clickEvent => {
    if (hasMoved) {
      clickEvent.stopImmediatePropagation();
    }
  });
}
document.addEventListener("keydown", inputEvent => {
  if (inputEvent.target.matches("input,textarea,select,[contenteditable]")) {
    return;
  }
  if (inputEvent.repeat) {
    return;
  }
  if (inputEvent.key.toLowerCase() === pressedKeyQ.toLowerCase()) {
    inputEvent.preventDefault();
    inputEvent.stopPropagation();
    simulatePointerMove("left");
  }
  if (inputEvent.key.toLowerCase() === pressedKeyE.toLowerCase()) {
    inputEvent.preventDefault();
    inputEvent.stopPropagation();
    simulatePointerMove("right");
  }
}, true);
document.addEventListener("keydown", inputEvent_2 => {
  if (inputEvent_2.target.matches("input,textarea,select,[contenteditable]")) {
    return;
  }
  if (inputEvent_2.repeat) {
    return;
  }
  if (inputEvent_2.key.toLowerCase() === window.lockKey.toLowerCase()) {
    inputEvent_2.preventDefault();
    toggleLock();
  }
}, true);

export { simulateTextInput, showNotification, initAutofillName, typeChatMessage, initializeTextInterceptor, simulateClick, showHalloweenCodeModal, makeElementDraggable };
