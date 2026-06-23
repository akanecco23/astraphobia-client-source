import { showNotification } from "./ui/interaction.js";
import { getAllPropertyNames } from "./utils.js";
import {
  initControlOverlay,
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./ui/panels.js";
import { initBackgroundImage } from "./ui/theme.js";
import { initAdBlocker } from "./features/adblock.js";

const stateMap = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateMap.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

let isInitialized = false;
function hookTextEncoder(config) {
  if (isInitialized) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, sequence, hexValue1, hexValue2, hexValue3) => {
        switch (sequence[0]) {
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
            return String.fromCharCode(Number.parseInt(sequence, 8) || 0);
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
                return match;
              } else {
                return String.fromCodePoint(codePoint);
              }
            }
            return sequence;
        }
      },
    );
  }
  const packetTypes = {
    spawn: 22,
    createTribe: 5,
    chat: 100,
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputArgs) {
    try {
      const messagePatterns = [
        /^(\x14{3}\d+\|6\|)(.+)$/gm,
        /^(\x14{3}\d+\|8\|)(.+)$/gm,
        /^(\x14{3}\d+\|14\|)(.+)$/gm,
        /^(\x13{3}[01])(.+)$/gm,
      ];
      for (
        let patternIndex = 0;
        patternIndex < messagePatterns.length;
        patternIndex++
      ) {
        const regexMatch = messagePatterns[patternIndex].exec(inputArgs[0]);
        if (regexMatch && regexMatch.length === 3) {
          const actionHandler = [
            packetTypes.spawn,
            packetTypes.spawn,
            packetTypes.createTribe,
            packetTypes.chat,
          ][patternIndex];
          inputArgs[0] =
            regexMatch[1] +
            unescapeString(regexMatch[2]).substr(0, actionHandler);
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
  isInitialized = true;
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
let game;
let appState;
let player;
let isActive = false;

const encryptPacketData = (inputData, checksumByte, suffix = "") => {
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
  if (!inputData) {
    return null;
  }
  const plainText = ((plainText, keyText) => {
    const textEncoder = new TextEncoder();
    const plainTextBytes =
      textEncoder[stringTable[5] + stringTable[0]](plainText);
    const keyBytes = textEncoder[stringTable[10] + stringTable[7]](keyText);
    const cipherTextBytes = new Uint8Array(
      plainTextBytes["l" + stringTable[4] + stringTable[6].slice(0, 2)],
    );
    for (let i = 0; i < plainTextBytes.length; i++) {
      cipherTextBytes[i] =
        plainTextBytes[i] ^
        keyBytes[
          i %
            keyBytes[
              "" +
                stringTable[9].toLowerCase() +
                stringTable[10] +
                "g" +
                stringTable[6].slice(0, 2)
            ]
        ];
    }
    return btoa(String.fromCharCode(...cipherTextBytes));
  })(
    String.fromCharCode(checksumByte)[stringTable[8] + stringTable[1]](3) +
      suffix,
    inputData,
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
  dataView.setUint8(totalBufferSize - 1, checksumByte);
  return arrayBuffer;
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
const sendPacket = (payload, additionalData = "") => {
  if (game && appState && state.socketManager) {
    game[state.socketManager].sendBytePacket(
      encryptPacketData(appState.token._value, payload, additionalData),
    );
  }
};
const state = {};
const counter = 0;
const initHooks = () => {
  const propertyCache = {};
  for (const propName of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propName] = Reflect[propName];
  }
  const ProxyClass = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const createPropertyProxy = (targetObject, propertyKey, propertyValue) => {
    const propertyInstance = new ProxyClass(
      targetObject[propertyKey],
      propertyValue,
    );
    stateMap.set(propertyInstance, targetObject[propertyKey]);
    targetObject[propertyKey] = propertyInstance;
  };
  createPropertyProxy(Function.prototype, "toString", {
    apply(thisContext, propertyKey_2, thisArg) {
      return propertyCache.apply(
        thisContext,
        stateMap.get(propertyKey_2) || propertyKey_2,
        thisArg,
      );
    },
  });
  createPropertyProxy(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = propertyCache.construct(constructor, constructorArgs);
      return instance;
    },
  });
  createPropertyProxy(ProxyClass, "revocable", {
    apply(targetFunction, functionArgs, functionContext) {
      const functionResult = propertyCache.apply(
        targetFunction,
        functionArgs,
        functionContext,
      );
      return functionResult;
    },
  });
  let lastTimestamp = 0;
  createPropertyProxy(Function.prototype, "bind", {
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
          player = functionContext2[0];
          game = functionContext2[0].game;
          const allKeys = getAllPropertyNames(player);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(player.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find((methodName) => player[methodName] instanceof Function) ||
            state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) => typeof player[shadowKey]?.shadow !== "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof player[entitiesListKey]?.entitiesList !== "undefined",
            ) || state.entityManager;
          state.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            player[state.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            state.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof player?.[state.entityManager]?.[entityKey]?.[0] !==
                    "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(game).find(
              (packetSenderKey) =>
                typeof game[packetSenderKey]?.sendBytePacket !== "undefined",
            ) || state.socketManager;
          try {
            appState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let myAnimalsUpdateInterval;
          try {
            clearInterval(myAnimalsUpdateInterval);
          } catch {}
          myAnimalsUpdateInterval = setInterval(() => {
            try {
              if (!player?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = player.myAnimals[0];
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
              clearInterval(myAnimalsUpdateInterval);
            } catch {}
          }, 200);
          if (lastTimestamp < Date.now() - 3000) {
            showNotification("✅ Astraphobia client loaded in game");
            lastTimestamp = Date.now();
          }
          initControlOverlay();
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
const disableGameRestrictions = () => {
  if (isActive) {
    return;
  }
  if (!player) {
    setTimeout(disableGameRestrictions, 500);
    return;
  }
  setInterval(() => {
    try {
      game.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      game.viewport.plugins.plugins.clamp = null;
      game.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (state.setFlash) {
      player[state.setFlash] = () => {};
    }
    if (state.terrainManager) {
      const terrainManager = player[state.terrainManager];
      if (terrainManager && terrainManager.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (error) {
    console.error(error);
  }
  isActive = true;
};

function initializePanels() {
  const mainPanelElement = createDeepToolsPanel();
  const historyPanelElement = createUpdateHistoryPanel();
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
    event.key === coreSharedState.currentKey &&
    !event.repeat &&
    !event.target.matches("input, textarea, button")
  ) {
    event.preventDefault();
    togglePanels();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    initHooks();
    initAdBlocker();
    initBackgroundImage();
  }, 1000);
});

export const coreSharedState = {
  updateInterval: null,
  isProcessing: false,
  animationInterval: null,
  angleIndex: 0,
  isInitialized_2: false,
  isActive_2: false,
  currentKey: "Shift",
};

export {
  wrapWithProxy,
  hookTextEncoder,
  encryptPacketData,
  sendPacket,
  initHooks,
  disableGameRestrictions,
  initializePanels,
  angles,
  radius,
  game,
  player,
  isActive,
  securitySettings,
};
