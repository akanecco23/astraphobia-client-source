import {
  createUpdateHistoryPanel,
  createToolsPanel,
  initPlusPanel,
  initSettingsPanel,
  togglePanels,
} from "./ui/panels.js";
import { handleAnimalAction } from "./features/autofarm.js";
import { initAdBlocker } from "./features/adblock.js";
import { getAllPropertyNames } from "./utils.js";
import { showToast } from "./ui/interaction.js";

const stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

let isProcessed = false;
function setupTextEncoderHook(unusedParam) {
  if (isProcessed) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (fullMatch, escapeSequence, hexValue1, hexValue2, hexValue3) => {
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
                return fullMatch;
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
  TextEncoder.prototype.encode = function (...inputArgs) {
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
        const matchResult = commandPatterns[patternIndex].exec(inputArgs[0]);
        if (matchResult && matchResult.length === 3) {
          const actionHandler = [
            actionIds.spawn,
            actionIds.spawn,
            actionIds.createTribe,
            actionIds.chat,
          ][patternIndex];
          inputArgs[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, actionHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputArgs);
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
  isProcessed = true;
  if (unusedParam) {
    unusedParam.textContent = "Special Characters Active";
    unusedParam.disabled = true;
    unusedParam.style.opacity = "0.6";
    unusedParam.style.cursor = "not-allowed";
  }
  showToast("✅ Special Characters enabled! (One-time use)");
}

const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
let gameInstance;
let appState;
let playerData;
let isProcessed_rot = false;
let isProcessed_t1s = false;
const encryptPacketData = (url, terminatorCode, suffix = "") => {
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
  if (!url) {
    return null;
  }
  const plainText = ((text1, text2) => {
    const textEncoder = new TextEncoder();
    const encodedText1 = textEncoder[stringPool[5] + stringPool[0]](text1);
    const encodedText2 = textEncoder[stringPool[10] + stringPool[7]](text2);
    const buffer = new Uint8Array(
      encodedText1["l" + stringPool[4] + stringPool[6].slice(0, 2)],
    );
    for (let i = 0; i < encodedText1.length; i++) {
      buffer[i] =
        encodedText1[i] ^
        encodedText2[
          i %
            encodedText2[
              "" +
                stringPool[9].toLowerCase() +
                stringPool[10] +
                "g" +
                stringPool[6].slice(0, 2)
            ]
        ];
    }
    return btoa(String.fromCharCode(...buffer));
  })(
    String.fromCharCode(terminatorCode)[stringPool[8] + stringPool[1]](3) +
      suffix,
    url,
  );
  const encodedBytes = new TextEncoder()[stringPool[5] + stringPool[0]](
    plainText,
  );
  const totalBufferSize = 1 + encodedBytes.byteLength + 1;
  const rawBuffer = new ArrayBuffer(totalBufferSize);
  const bufferView = new DataView(rawBuffer);
  bufferView.setUint8(0, 25);
  new Uint8Array(rawBuffer)[stringPool[11].slice(0, (9 / 27) * 9)](
    encodedBytes,
    1,
  );
  bufferView.setUint8(totalBufferSize - 1, terminatorCode);
  return rawBuffer;
};
const config = {
  93: {
    hasSec: true,
    secLoadTime: 750,
  },
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
const sendPacket = (payload, additionalData = "") => {
  if (gameInstance && appState && config_skh.socketManager) {
    gameInstance[config_skh.socketManager].sendBytePacket(
      encryptPacketData(appState.token, payload, additionalData),
    );
  }
};
const config_skh = {};
const currentTime = 0;
const initHooks = () => {
  const propertyCache = {};
  for (const propertyName of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propertyName] = Reflect[propertyName];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapWithProxy = (state, url, value) => {
    const wrappedValue = new ProxyConstructor(state[url], value);
    stateCache.set(wrappedValue, state[url]);
    state[url] = wrappedValue;
  };
  wrapWithProxy(Function.prototype, "toString", {
    apply(thisContext, key, context) {
      return propertyCache.apply(
        thisContext,
        stateCache.get(key) || key,
        context,
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
    apply(targetFunction, functionArgs, functionContext) {
      const functionResult = propertyCache.apply(
        targetFunction,
        functionArgs,
        functionContext,
      );
      return functionResult;
    },
  });
  let lastExecutionTime = 0;
  wrapWithProxy(Function.prototype, "bind", {
    apply(targetFunction2, functionArgs2, functionContext2) {
      try {
        try {
          if (
            lookupGetter.call(
              functionContext2[0],
              "aboveBgPlatformsContainer",
            ) != null
          ) {
            return propertyCache.apply(
              targetFunction2,
              functionArgs2,
              functionContext2,
            );
          }
        } catch {}
        if (
          functionContext2[0] &&
          functionContext2[0].aboveBgPlatformsContainer != null
        ) {
          playerData = functionContext2[0];
          gameInstance = functionContext2[0].game;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedKey) =>
            obfuscatedKey.startsWith("_0x"),
          );
          config_skh.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((obfuscatedName) => obfuscatedName.startsWith("_0x"))
              .find(
                (functionKey) => playerData[functionKey] instanceof Function,
              ) || config_skh.setFlash;
          config_skh.terrainManager =
            obfuscatedKeys.find(
              (shadowObjectKey) =>
                typeof playerData[shadowObjectKey]?.shadow !== "undefined",
            ) || config_skh.terrainManager;
          config_skh.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || config_skh.entityManager;
          config_skh.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[config_skh.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            config_skh.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityType) =>
                    typeof playerData?.[config_skh.entityManager]?.[
                      entityType
                    ]?.[0] !== "undefined",
                ) || config_skh.entityManagerProps.animalsList;
            if (
              typeof config_skh.entityManagerProps.animalsList !== "undefined"
            ) {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          config_skh.socketManager =
            getAllPropertyNames(gameInstance).find(
              (packetSenderKey) =>
                typeof gameInstance[packetSenderKey]?.sendBytePacket !==
                "undefined",
            ) || config_skh.socketManager;
          try {
            appState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let animalsCheckInterval;
          try {
            clearInterval(animalsCheckInterval);
          } catch {}
          animalsCheckInterval = setInterval(() => {
            try {
              if (!playerData?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = playerData.myAnimals[0];
              if (myAnimal.fadingTrail) {
                const fadingTrailProto = Object.getPrototypeOf(
                  myAnimal.fadingTrail,
                );
                wrapWithProxy(fadingTrailProto, "enable", {
                  apply() {},
                });
              }
              if (myAnimal.bubblesEmitter) {
                const bubblesEmitterProto = Object.getPrototypeOf(
                  myAnimal.bubblesEmitter,
                );
                Object.defineProperty(bubblesEmitterProto, "emit", {
                  set: () => {},
                });
              }
              clearInterval(animalsCheckInterval);
            } catch {}
          }, 200);
          if (lastExecutionTime < Date.now() - 3000) {
            showToast("✅ Astraphobia client loaded in game");
            lastExecutionTime = Date.now();
          }
          disableZoomClamp();
          initGameCheats();
        }
      } catch {}
      return propertyCache.apply(
        targetFunction2,
        functionArgs2,
        functionContext2,
      );
    },
  });
};
const disableZoomClamp = () => {
  if (isProcessed_rot) {
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
  isProcessed_rot = true;
};
const initGameCheats = () => {
  if (isProcessed_t1s) {
    return;
  }
  function sendActionSequence() {
    try {
      handleAnimalAction(1);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 50);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 100);
      setTimeout(() => {
        handleAnimalAction(5000);
      }, 150);
    } catch {}
  }
  function createControlOverlay() {
    try {
      document.getElementById("ctrl-overlay").remove();
    } catch {}
    const overlayElement = document.createElement("div");
    const gameContainer = document.querySelector("div.game");
    if (gameContainer) {
      gameContainer.insertBefore(overlayElement, gameContainer.children[0]);
    }
    overlayElement.outerHTML =
      '<div id="ctrl-overlay" style="width: 100%;height: 100%;position: absolute;display: block;z-index:10000;pointer-events:none;"></div>';
    document
      .getElementById("ctrl-overlay")
      .addEventListener("contextmenu", (event) => event.preventDefault());
  }
  createControlOverlay();
  window.addEventListener(
    "click",
    (animalsProcessHandler) => {
      try {
        if (!playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel = playerData.myAnimals[0].visibleFishLevel;
        const fishLevelConfig = {
          ...config.default,
          ...config[visibleFishLevel],
        };
        if (animalsProcessHandler.ctrlKey) {
          if (animalsProcessHandler.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            animalsProcessHandler.shiftKey &&
            visibleFishLevel !== 101 &&
            playerData.myAnimals[0]._standing
          ) {
            handleAnimalAction(
              Math.floor(Math.random() * 1647483648) + 500000000,
            );
            return;
          } else {
            if (visibleFishLevel === 93 && fishLevelConfig.hasSec) {
              handleAnimalAction(1000);
              return;
            }
            let keyMap = Object.getOwnPropertyNames(gameInstance)
              .map((serviceKey) => gameInstance[serviceKey])
              .find((keyCollection) => keyCollection.keys instanceof Array);
            if (keyMap) {
              keyMap.pointerDown = true;
              keyMap.pressElapsed = Infinity;
              keyMap.setPointerDown(false);
            }
          }
        } else if (animalsProcessHandler.altKey) {
          handleAnimalAction(
            playerData?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(fishLevelConfig.secLoadTime / 2),
          );
        }
      } catch {}
    },
    false,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      try {
        if (!event.ctrlKey && !event.altKey) {
          document.getElementById("ctrl-overlay").style.pointerEvents = "none";
        }
      } catch {}
    },
    false,
  );
  window.addEventListener("focus", () => {
    try {
      document.getElementById("ctrl-overlay").style.pointerEvents = "none";
    } catch {}
  });
  isProcessed_t1s = true;
};

function initAllPanels() {
  const mainPanel = createToolsPanel();
  const historyPanel = createUpdateHistoryPanel();
  const settingsPanel = initSettingsPanel();
  const plusPanel = initPlusPanel();
  initAdBlocker();
  return {
    mainPanel: mainPanel,
    historyPanel: historyPanel,
    settingsPanel: settingsPanel,
    plusPanel: plusPanel,
  };
}
document.addEventListener("keydown", (keyboardEvent) => {
  if (
    keyboardEvent.key === state.activeKey &&
    !keyboardEvent.repeat &&
    !keyboardEvent.target.matches("input, textarea, button")
  ) {
    keyboardEvent.preventDefault();
    togglePanels();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    initHooks();
    initAdBlocker();
  }, 1000);
});

export const state = {
  entityTrailInterval: null,
  isToggled: false,
  angleIndex: 0,
  activeKey: "Shift",
};

export {
  wrapWithProxy,
  setupTextEncoderHook,
  encryptPacketData,
  sendPacket,
  initHooks,
  disableZoomClamp,
  initGameCheats,
  initAllPanels,
  angles,
  radius,
  playerData,
  isProcessed_t1s,
  config,
};
