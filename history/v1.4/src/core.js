import { showNotification, simulateTyping } from "./ui/interaction.js";
import { getAllPropertyNames, generateRandomString } from "./utils.js";
import {
  initControlOverlay,
  setupUpdateHistory,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./ui/panels.js";
import { startScheduledTask, stopInterval, autoChat } from "./features/chat.js";
import { toggleMouseSimulation } from "./features/movement.js";
import { initBackgroundImage } from "./ui/theme.js";
import { initAdBlocker } from "./features/adblock.js";

const stateMap = new WeakMap();
function wrapPropertyWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateMap.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

let isInitialized = false;
function initPacketInterceptor(config) {
  if (isInitialized) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (context, escapeSequence, hexValue1, hexValue2, hexValue3) => {
        switch (escapeSequence[0]) {
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
            return String.fromCharCode(Number.parseInt(escapeSequence, 8) || 0);
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
            return escapeSequence;
        }
      },
    );
  }
  const actionIds = {
    spawn: 22,
    createTribe: 5,
    chat: 100,
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputPayload) {
    try {
      const commandPatterns = [
        /^(\x14{3}\d+\|6\|)(.+)$/gm,
        /^(\x14{3}\d+\|8\|)(.+)$/gm,
        /^(\x14{3}\d+\|14\|)(.+)$/gm,
        /^(\x13{3}[01])(.+)$/gm,
      ];
      for (
        let patternIndex = 0;
        patternIndex < commandPatterns.length;
        patternIndex++
      ) {
        const matchResult = commandPatterns[patternIndex].exec(inputPayload[0]);
        if (matchResult && matchResult.length === 3) {
          const actionHandler = [
            actionIds.spawn,
            actionIds.spawn,
            actionIds.createTribe,
            actionIds.chat,
          ][patternIndex];
          inputPayload[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, actionHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputPayload);
  };
  const inputMaxLengthObserver = new MutationObserver(() => {
    document
      .querySelector(".play-game .el-input__inner")
      ?.setAttribute("maxlength", "80");
    document
      .querySelector(".new-tribe .el-input__inner")
      ?.setAttribute("maxlength", "20");
    document
      .querySelector(".chat-input input")
      ?.setAttribute("maxLength", "1000");
  });
  inputMaxLengthObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
  isInitialized = true;
  if (config) {
    config.textContent = "Special Characters Active";
    config.disabled = true;
    config.style.opacity = "0.6";
    config.style.cursor = "not-allowed";
  }
  showNotification("✅ Special Characters enabled! (One-time use)");
}

const rotationAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const orbitRadius = 300;
let gameInstance;
let globalState;
let playerData;
let isReady = false;

const encryptPacketData = (message, byteValue, suffix = "") => {
  const stringPool = [
    "ode",
    "eat",
    "fr",
    "bite",
    "eng",
    "enc",
    "the",
    "code",
    "rep",
    "L",
    "en",
    "setter",
  ];
  if (!message) {
    return null;
  }
  const plainText = ((firstText, secondText) => {
    const textEncoder = new TextEncoder();
    const firstEncodedBytes =
      textEncoder[stringPool[5] + stringPool[0]](firstText);
    const secondEncodedBytes =
      textEncoder[stringPool[10] + stringPool[7]](secondText);
    const byteBuffer = new Uint8Array(
      firstEncodedBytes["l" + stringPool[4] + stringPool[6].slice(0, 2)],
    );
    for (let i = 0; i < firstEncodedBytes.length; i++) {
      byteBuffer[i] =
        firstEncodedBytes[i] ^
        secondEncodedBytes[
          i %
            secondEncodedBytes[
              "" +
                stringPool[9].toLowerCase() +
                stringPool[10] +
                "g" +
                stringPool[6].slice(0, 2)
            ]
        ];
    }
    return btoa(String.fromCharCode(...byteBuffer));
  })(
    String.fromCharCode(byteValue)[stringPool[8] + stringPool[1]](3) + suffix,
    message,
  );
  const encodedText = new TextEncoder()[stringPool[5] + stringPool[0]](
    plainText,
  );
  const totalBufferSize = 1 + encodedText.byteLength + 1;
  const buffer = new ArrayBuffer(totalBufferSize);
  const dataView = new DataView(buffer);
  dataView.setUint8(0, 25);
  new Uint8Array(buffer)[stringPool[11].slice(0, (9 / 27) * 9)](encodedText, 1);
  dataView.setUint8(totalBufferSize - 1, byteValue);
  return buffer;
};
const securitySettings = {
  107: {
    hasSec: true,
    secLoadTime: 750,
    hasScaling: true,
  },
  default: {
    hasSec: false,
    secLoadTime: 500,
    hasScaling: false,
  },
};
const sendPacket = (payload, metadata = "") => {
  if (gameInstance && globalState && stateCache.socketManager) {
    gameInstance[stateCache.socketManager].sendBytePacket(
      encryptPacketData(globalState.token._value, payload, metadata),
    );
  }
};
const stateCache = {};
const counter = 0;
const setupProxyHooks = () => {
  const propertyCache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapWithProxy = (contextMap, contextKey, contextValue) => {
    const contextInstance = new ProxyConstructor(
      contextMap[contextKey],
      contextValue,
    );
    stateMap.set(contextInstance, contextMap[contextKey]);
    contextMap[contextKey] = contextInstance;
  };
  wrapWithProxy(Function.prototype, "toString", {
    apply(thisArg, propertyKey, applyParams) {
      return propertyCache.apply(
        thisArg,
        stateMap.get(propertyKey) || propertyKey,
        applyParams,
      );
    },
  });
  wrapWithProxy(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = propertyCache.construct(constructor, constructorArgs);
      return instance;
    },
  });
  wrapWithProxy(ProxyConstructor, "revocable", {
    apply(context, args, options) {
      const result = propertyCache.apply(context, args, options);
      return result;
    },
  });
  let lastExecutionTime = 0;
  wrapWithProxy(Function.prototype, "bind", {
    apply(callContext, callArgs, callOptions) {
      try {
        try {
          if (
            lookupGetter.call(callOptions[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return propertyCache.apply(callContext, callArgs, callOptions);
          }
        } catch {}
        if (
          callOptions[0] &&
          callOptions[0].aboveBgPlatformsContainer != null
        ) {
          playerData = callOptions[0];
          gameInstance = callOptions[0].game;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          stateCache.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((obfuscatedPropName) =>
                obfuscatedPropName.startsWith("_0x"),
              )
              .find(
                (functionKey) => playerData[functionKey] instanceof Function,
              ) || stateCache.setFlash;
          stateCache.terrainManager =
            obfuscatedKeys.find(
              (shadowObjectKey) =>
                typeof playerData[shadowObjectKey]?.shadow !== "undefined",
            ) || stateCache.terrainManager;
          stateCache.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || stateCache.entityManager;
          stateCache.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[stateCache.entityManager],
          );
          const animalsListInterval = setInterval(() => {
            stateCache.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityName) =>
                    typeof playerData?.[stateCache.entityManager]?.[
                      entityName
                    ]?.[0] !== "undefined",
                ) || stateCache.entityManagerProps.animalsList;
            if (
              typeof stateCache.entityManagerProps.animalsList !== "undefined"
            ) {
              clearInterval(animalsListInterval);
            }
          }, 1000);
          stateCache.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkClientKey) =>
                typeof gameInstance[networkClientKey]?.sendBytePacket !==
                "undefined",
            ) || stateCache.socketManager;
          try {
            globalState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let myAnimalsInterval;
          try {
            clearInterval(myAnimalsInterval);
          } catch {}
          myAnimalsInterval = setInterval(() => {
            try {
              if (!playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = playerData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                const fadingTrailPrototype = Object.getPrototypeOf(
                  firstAnimal.fadingTrail,
                );
                wrapPropertyWithProxy(fadingTrailPrototype, "enable", {
                  apply() {},
                });
              }
              if (firstAnimal.bubblesEmitter) {
                const bubblesEmitterPrototype = Object.getPrototypeOf(
                  firstAnimal.bubblesEmitter,
                );
                Object.defineProperty(bubblesEmitterPrototype, "emit", {
                  set: () => {},
                });
              }
              clearInterval(myAnimalsInterval);
            } catch {}
          }, 200);
          if (lastExecutionTime < Date.now() - 3000) {
            showNotification("✅ Astraphobia client loaded in game");
            lastExecutionTime = Date.now();
          }
          initControlOverlay();
        }
      } catch {}
      return propertyCache.apply(callContext, callArgs, callOptions);
    },
  });
};
const disableGameRestrictions = () => {
  if (isReady) {
    return;
  }
  if (!playerData) {
    setTimeout(disableGameRestrictions, 500);
    return;
  }
  setInterval(() => {
    try {
      gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      gameInstance.viewport.plugins.plugins.clamp = null;
      gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (stateCache.setFlash) {
      playerData[stateCache.setFlash] = () => {};
    }
    if (stateCache.terrainManager) {
      const terrainManager = playerData[stateCache.terrainManager];
      if (terrainManager && terrainManager.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (error) {
    console.error(error);
  }
  isReady = true;
};
function setupToolsPanel() {
  const toolsStyle = document.createElement("style");
  toolsStyle.textContent =
    "\n      :root {\n        --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);\n        --shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.4);\n      }\n      #deep-tools-panel {\n        font-family: 'Inter', 'Segoe UI', sans-serif;\n        transition: all 0.3s ease;\n        box-shadow: var(--shadow);\n        border: 1px solid var(--border);\n        background: var(--bg-primary);\n        backdrop-filter: blur(20px);\n        border-radius: 16px;\n      }\n      #deep-tools-panel:hover {\n        box-shadow: var(--shadow-hover);\n        transform: translateY(-2px);\n      }\n      #deep-tools-panel textarea {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 8px;\n        padding: 10px;\n        transition: all 0.2s ease;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: var(--accent);\n        box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 60px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #deep-tools-panel button {\n        background: var(--bg-secondary);\n        color: var(--accent);\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        padding: 10px 0;\n        font-weight: 500;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        position: relative;\n        overflow: hidden;\n      }\n      #deep-tools-panel button::before {\n        content: '';\n        position: absolute;\n        top: 0;\n        left: -100%;\n        width: 100%;\n        height: 100%;\n        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);\n        transition: left 0.5s;\n      }\n      #deep-tools-panel button:hover:not(:disabled)::before {\n        left: 100%;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: var(--hover-bg);\n        border-color: var(--accent);\n        transform: translateY(-1px);\n        box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-hover);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 12px;\n        font-size: 11px;\n        color: var(--text-secondary);\n        line-height: 1.4;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 8px;\n        margin-bottom: 10px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 10px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: var(--text-primary);\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: var(--bg-secondary);\n        border: 1px solid var(--border);\n        color: var(--text-primary);\n        border-radius: 6px;\n        padding: 6px;\n        width: 50px;\n        text-align: center;\n        transition: all 0.2s ease;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(toolsStyle);
  const container = document.createElement("div");
  container.id = "deep-tools-panel";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.color = "var(--text-primary)";
  container.style.padding = "16px";
  container.style.borderRadius = "16px";
  container.style.fontSize = "14px";
  container.style.zIndex = "99999";
  container.style.userSelect = "none";
  container.style.width = "240px";
  container.style.textAlign = "center";
  container.style.cursor = "move";
  container.style.overflow = "hidden";
  container.innerHTML =
    '\n      <div style="font-weight:600; margin-bottom:12px; color:var(--accent); height: 40px; line-height: 40px;">\n        ASTRAPHOBIA CLIENT\n      </div>\n      <div id="panelContent">\n        <textarea id="chatMsg" placeholder="Type message..." style="width:100%; height:50px; margin-bottom:10px; resize:none;"></textarea>\n        <button id="sendBtn" style="width:100%; margin-bottom:10px;">Send Typed Chat</button>\n        <div class="auto-chat-controls">\n          <input type="number" id="delayInput" min="1" max="300" value="10" style="margin-right:8px;">\n          <span style="font-size:12px;">sec</span>\n        </div>\n        <button id="autoChatBtn" style="width:100%; margin-bottom:10px;">Enable Auto Chat</button>\n        <button id="patchBtn" style="width:100%; margin-bottom:10px;">Enable Special Characters(in chat/clan/name)</button>\n        <button id="spoofBtn" style="width:100%; margin-bottom:10px;">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id="spinBtn" style="width:100%; margin-bottom:10px;">Enable Auto Spin</button>\n        <div class="spin-keybind">\n          <label for="spinKeyInput">Keybind:</label>\n          <input type="text" id="spinKeyInput" placeholder="PRESS" readonly>\n        </div>\n        <div class="credits">\n          Coder: Astraphobia<br>\n          Owner/Founder: Astraphobia<br>\n          Designer/Marketer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ';
  document.body.appendChild(container);
  container.querySelector("#sendBtn").onclick = () => {
    const chatMessage = container.querySelector("#chatMsg").value;
    if (chatMessage) {
      autoChat(chatMessage);
    }
  };
  const patchButton = container.querySelector("#patchBtn");
  patchButton.onclick = () => initPacketInterceptor(patchButton);
  const spoofButton = container.querySelector("#spoofBtn");
  spoofButton.onclick = () => {
    const randomValue = generateRandomString(8);
    if (simulateTyping(".play-game .el-input__inner", randomValue)) {
      showNotification("Spoofed name!");
    } else if (simulateTyping(".new-tribe .el-input__inner", randomValue)) {
      showNotification("Spoofed tribe name!");
    } else {
      showNotification("No name input found! Enable special characters first.");
    }
  };
  const spinButton = container.querySelector("#spinBtn");
  spinButton.onclick = () => {
    toggleMouseSimulation();
    if (state.animationIntervalId) {
      spinButton.textContent = "Disable Auto Spin";
      spinButton.style.color = "var(--accent)";
      spinButton.style.opacity = "0.6";
    } else {
      spinButton.textContent = "Enable Auto Spin";
      spinButton.style.color = "var(--accent)";
      spinButton.style.opacity = "1";
    }
  };
  const spinKeyInput = container.querySelector("#spinKeyInput");
  let pressedKey = null;
  spinKeyInput.addEventListener("keydown", (keyboardEvent) => {
    keyboardEvent.preventDefault();
    pressedKey = keyboardEvent.code || keyboardEvent.key;
    spinKeyInput.value = pressedKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", (keyboardEvent_2) => {
    if (
      pressedKey &&
      keyboardEvent_2.code === pressedKey &&
      !keyboardEvent_2.target.matches("input, textarea, button")
    ) {
      keyboardEvent_2.preventDefault();
      toggleMouseSimulation();
      if (state.animationIntervalId) {
        spinButton.textContent = "Disable Auto Spin";
        spinButton.style.color = "var(--accent)";
        spinButton.style.opacity = "0.6";
      } else {
        spinButton.textContent = "Enable Auto Spin";
        spinButton.style.color = "var(--accent)";
        spinButton.style.opacity = "1";
      }
    }
  });
  const autoChatButton = container.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const chatMessage_2 = container.querySelector("#chatMsg").value;
    const delayInput = container.querySelector("#delayInput");
    const delayValue = parseInt(delayInput.value) || 10;
    if (!chatMessage_2) {
      showNotification("⚠️ Enter a message first!");
      return;
    }
    if (state.isProcessing) {
      stopInterval();
      autoChatButton.textContent = "Enable Auto Chat";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "1";
    } else {
      startScheduledTask(chatMessage_2, delayValue);
      autoChatButton.textContent = "Disable Auto Chat";
      autoChatButton.style.color = "var(--accent)";
      autoChatButton.style.opacity = "0.6";
    }
  };
  let offsetX;
  let offsetY;
  let isActive = false;
  let isDragging = false;
  container.addEventListener("mousedown", (clickEvent) => {
    if (
      clickEvent.target.tagName === "BUTTON" ||
      clickEvent.target.tagName === "TEXTAREA" ||
      clickEvent.target.tagName === "INPUT" ||
      clickEvent.target.classList.contains("credits")
    ) {
      return;
    }
    isActive = true;
    isDragging = false;
    offsetX = clickEvent.clientX - container.getBoundingClientRect().left;
    offsetY = clickEvent.clientY - container.getBoundingClientRect().top;
    container.style.transition = "none";
    const handleMouseMove = (mouseEvent) => {
      const deltaX = mouseEvent.clientX - clickEvent.clientX;
      const deltaY = mouseEvent.clientY - clickEvent.clientY;
      if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isDragging = true;
      }
      if (isActive) {
        container.style.left = mouseEvent.clientX - offsetX + "px";
        container.style.top = mouseEvent.clientY - offsetY + "px";
        container.style.bottom = "auto";
        container.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isActive = false;
      container.style.transition = "all 0.3s ease";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  container.addEventListener("click", (event) => {
    if (isDragging) {
      event.stopImmediatePropagation();
    }
  });
  return container;
}

function initializePanels() {
  const mainPanelElement = setupToolsPanel();
  const historyPanelElement = setupUpdateHistory();
  const settingsPanelElement = injectSettingsStyles();
  const plusPanelElement = injectPlusPanelStyles();
  initBackgroundImage();
  initAdBlocker();
  return {
    mainPanel: mainPanelElement,
    historyPanel: historyPanelElement,
    settingsPanel: settingsPanelElement,
    plusPanel: plusPanelElement,
  };
}
document.addEventListener("keydown", (event) => {
  if (
    event.key === state.currentKey &&
    !event.repeat &&
    !event.target.matches("input, textarea, button")
  ) {
    event.preventDefault();
    togglePanels();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    setupProxyHooks();
    initAdBlocker();
    initBackgroundImage();
  }, 1000);
});

export const state = {
  mainIntervalId: null,
  isProcessing: false,
  animationIntervalId: null,
  angleIndex: 0,
  isInitialized_2: false,
  isProcessing_2: false,
  currentKey: "Shift",
};

export {
  wrapPropertyWithProxy,
  initPacketInterceptor,
  encryptPacketData,
  sendPacket,
  setupProxyHooks,
  disableGameRestrictions,
  setupToolsPanel,
  initializePanels,
  rotationAngles,
  orbitRadius,
  gameInstance,
  playerData,
  isReady,
  securitySettings,
};
