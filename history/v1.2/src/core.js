import {
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  createPlusPanel,
  togglePanels,
} from "./ui/panels.js";
import { applyCustomBackground, createSettingsStyles } from "./ui/theme.js";
import { handleAnimalAction } from "./features/autofarm.js";
import { showNotification } from "./ui/interaction.js";
import { initAdBlocker } from "./features/adblock.js";
import { getAllPropertyNames } from "./utils.js";

const stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyInstance = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyInstance, originalValue);
  targetObject[propertyKey] = proxyInstance;
}

let IsProcessed = false;
function initNetworkHook(config) {
  if (IsProcessed) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, escapeSequence, hexValue, unicodeValue, extendedUnicodeValue) => {
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
            if (hexValue != null) {
              return String.fromCharCode(Number.parseInt(hexValue, 16) || 0);
            }
            if (unicodeValue != null) {
              return String.fromCharCode(
                Number.parseInt(unicodeValue, 16) || 0,
              );
            }
            if (extendedUnicodeValue != null) {
              const codePoint = Number.parseInt(extendedUnicodeValue, 16) || 0;
              if (codePoint > 1114111) {
                return match;
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
  TextEncoder.prototype.encode = function (...args) {
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
        const matchResult = commandPatterns[patternIndex].exec(args[0]);
        if (matchResult && matchResult.length === 3) {
          const commandHandler = [
            actionIds.spawn,
            actionIds.spawn,
            actionIds.createTribe,
            actionIds.chat,
          ][patternIndex];
          args[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, commandHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, args);
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
  IsProcessed = true;
  if (config) {
    config.textContent = "Special Characters Active";
    config.disabled = true;
    config.style.opacity = "0.6";
    config.style.cursor = "not-allowed";
  }
  showNotification("✅ Special Characters enabled! (One-time use)");
}

const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
let gameInstance;
let State;
let playerData;
let boolIsProcessed = false;
let appIsProcessed = false;
const encryptPacketData = (options, charCode, suffix = "") => {
  const stringTable = [
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
  if (!options) {
    return null;
  }
  const plainText = ((v1c68InputString, keyString) => {
    const textEncoder = new TextEncoder();
    const encodedInput =
      textEncoder[stringTable[5] + stringTable[0]](v1c68InputString);
    const encodedKey = textEncoder[stringTable[10] + stringTable[7]](keyString);
    const outputBuffer = new Uint8Array(
      encodedInput["l" + stringTable[4] + stringTable[6].slice(0, 2)],
    );
    for (let a364I = 0; a364I < encodedInput.length; a364I++) {
      outputBuffer[a364I] =
        encodedInput[a364I] ^
        encodedKey[
          a364I %
            encodedKey[
              "" +
                stringTable[9].toLowerCase() +
                stringTable[10] +
                "g" +
                stringTable[6].slice(0, 2)
            ]
        ];
    }
    return btoa(String.fromCharCode(...outputBuffer));
  })(
    String.fromCharCode(charCode)[stringTable[8] + stringTable[1]](3) + suffix,
    options,
  );
  const encodedBytes = new TextEncoder()[stringTable[5] + stringTable[0]](
    plainText,
  );
  const totalBufferSize = 1 + encodedBytes.byteLength + 1;
  const arrayBuffer = new ArrayBuffer(totalBufferSize);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, 25);
  new Uint8Array(arrayBuffer)[stringTable[11].slice(0, (9 / 27) * 9)](
    encodedBytes,
    1,
  );
  dataView.setUint8(totalBufferSize - 1, charCode);
  return arrayBuffer;
};
const objConfig = {
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
const sendPacket = (payload, extraData = "") => {
  if (gameInstance && State && Config.socketManager) {
    gameInstance[Config.socketManager].sendBytePacket(
      encryptPacketData(State.token._value, payload, extraData),
    );
  }
};
const Config = {};
const currentTime = 0;
const setupAntiDetection = () => {
  const storage = {};
  for (const v3b38PropertyKey of Object.getOwnPropertyNames(Reflect)) {
    storage[v3b38PropertyKey] = Reflect[v3b38PropertyKey];
  }
  const ProxyClass = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const v1cefWrapWithProxy = (dataStore, storeIndex, storeValue) => {
    const processedValue = new ProxyClass(dataStore[storeIndex], storeValue);
    stateCache.set(processedValue, dataStore[storeIndex]);
    dataStore[storeIndex] = processedValue;
  };
  v1cefWrapWithProxy(Function.prototype, "toString", {
    apply(context, functionKey, applyArgs) {
      return storage.apply(
        context,
        stateCache.get(functionKey) || functionKey,
        applyArgs,
      );
    },
  });
  v1cefWrapWithProxy(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = storage.construct(constructor, constructorArgs);
      return instance;
    },
  });
  v1cefWrapWithProxy(ProxyClass, "revocable", {
    apply(applyContext, applyTarget, applyArgs2) {
      const applyResult = storage.apply(applyContext, applyTarget, applyArgs2);
      return applyResult;
    },
  });
  let lastTimestamp = 0;
  v1cefWrapWithProxy(Function.prototype, "bind", {
    apply(applyContext2, applyTarget2, applyArgs3) {
      try {
        try {
          if (
            lookupGetter.call(applyArgs3[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return storage.apply(applyContext2, applyTarget2, applyArgs3);
          }
        } catch {}
        if (applyArgs3[0] && applyArgs3[0].aboveBgPlatformsContainer != null) {
          playerData = applyArgs3[0];
          gameInstance = applyArgs3[0].game;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          Config.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((targetVarName) => targetVarName.startsWith("_0x"))
              .find(
                (methodName) => playerData[methodName] instanceof Function,
              ) || Config.setFlash;
          Config.terrainManager =
            obfuscatedKeys.find(
              (shadowEntityKey) =>
                typeof playerData[shadowEntityKey]?.shadow !== "undefined",
            ) || Config.terrainManager;
          Config.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || Config.entityManager;
          Config.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[Config.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            Config.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof playerData?.[Config.entityManager]?.[
                      entityKey
                    ]?.[0] !== "undefined",
                ) || Config.entityManagerProps.animalsList;
            if (typeof Config.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          Config.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkServiceKey) =>
                typeof gameInstance[networkServiceKey]?.sendBytePacket !==
                "undefined",
            ) || Config.socketManager;
          try {
            State = document
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
                const fadingTrailPrototype = Object.getPrototypeOf(
                  myAnimal.fadingTrail,
                );
                wrapWithProxy(fadingTrailPrototype, "enable", {
                  apply() {},
                });
              }
              if (myAnimal.bubblesEmitter) {
                const bubblesEmitterPrototype = Object.getPrototypeOf(
                  myAnimal.bubblesEmitter,
                );
                Object.defineProperty(bubblesEmitterPrototype, "emit", {
                  set: () => {},
                });
              }
              clearInterval(animalsCheckInterval);
            } catch {}
          }, 200);
          if (lastTimestamp < Date.now() - 3000) {
            showNotification("✅ Astraphobia client loaded in game");
            lastTimestamp = Date.now();
          }
          initMod();
        }
      } catch {}
      return storage.apply(applyContext2, applyTarget2, applyArgs3);
    },
  });
};
const applyGameHacks = () => {
  if (boolIsProcessed) {
    return;
  }
  if (!playerData) {
    setTimeout(applyGameHacks, 500);
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
    if (Config.setFlash) {
      playerData[Config.setFlash] = () => {};
    }
    if (Config.terrainManager) {
      const terrainManager = playerData[Config.terrainManager];
      if (terrainManager && terrainManager.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (url) {
    console.error(url);
  }
  boolIsProcessed = true;
};
const initMod = () => {
  if (appIsProcessed) {
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
        const v363dFishLevelConfig = {
          ...objConfig.default,
          ...objConfig[visibleFishLevel],
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
            let keyMappingConfig = Object.getOwnPropertyNames(gameInstance)
              .map((serviceKey) => gameInstance[serviceKey])
              .find((keyMap) => keyMap.keys instanceof Array);
            if (keyMappingConfig) {
              keyMappingConfig.pointerDown = true;
              keyMappingConfig.pressElapsed = Infinity;
              keyMappingConfig.setPointerDown(false);
            }
          }
        } else if (animalsProcessHandler.altKey) {
          handleAnimalAction(
            playerData?.myAnimals?.[0]?._standing
              ? 41
              : Math.floor(v363dFishLevelConfig.secLoadTime / 2),
          );
        }
      } catch {}
    },
    false,
  );
  window.addEventListener(
    "keyup",
    (keyboardEvent) => {
      try {
        if (!keyboardEvent.ctrlKey && !keyboardEvent.altKey) {
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
  appIsProcessed = true;
};

function initializePanels() {
  const PanelElement = createDeepToolsPanel();
  const historyPanelElement = createUpdateHistoryPanel();
  const settingsPanelElement = createSettingsStyles();
  const plusPanelElement = createPlusPanel();
  applyCustomBackground();
  initAdBlocker();
  return {
    mainPanel: PanelElement,
    historyPanel: historyPanelElement,
    settingsPanel: settingsPanelElement,
    plusPanel: plusPanelElement,
  };
}
document.addEventListener("keydown", (v2827Event) => {
  if (
    v2827Event.key === state.activeKey &&
    !v2827Event.repeat &&
    !v2827Event.target.matches("input, textarea, button")
  ) {
    v2827Event.preventDefault();
    togglePanels();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    setupAntiDetection();
    initAdBlocker();
    applyCustomBackground();
  }, 1000);
});

export const state = {
  IsToggled: false,
  angleIndex: 0,
  activeKey: "Shift",
};

export {
  wrapWithProxy,
  initNetworkHook,
  encryptPacketData,
  sendPacket,
  setupAntiDetection,
  applyGameHacks,
  initMod,
  initializePanels,
  angles,
  radius,
  playerData,
  boolIsProcessed,
  appIsProcessed,
  objConfig,
};
