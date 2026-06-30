import {
  initControlOverlay,
  createUpdateHistoryPanel,
  createDeepToolsPanel,
  injectPlusPanelStyles,
  injectSettingsStyles,
  togglePanels,
} from "./ui/panels.js";
import { showNotification } from "./ui/interaction.js";
import { initAdBlocker } from "./features/adblock.js";
import { initBackgroundImage } from "./ui/theme.js";
import { getAllPropertyNames } from "./utils.js";

const stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

let isProcessed = false;
function hookTextEncoder(config) {
  if (isProcessed) {
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
  isProcessed = true;
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
let appState;
let playerData;
let isProcessed_2 = false;

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
const config = {
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
  if (gameInstance && appState && config_2.socketManager) {
    gameInstance[config_2.socketManager].sendBytePacket(
      encryptPacketData(appState.token._value, payload, additionalData),
    );
  }
};
const config_2 = {};
const currentTime = 0;
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
    stateCache.set(propertyInstance, targetObject[propertyKey]);
    targetObject[propertyKey] = propertyInstance;
  };
  createPropertyProxy(Function.prototype, "toString", {
    apply(thisContext, propertyKey_2, thisArg) {
      return propertyCache.apply(
        thisContext,
        stateCache.get(propertyKey_2) || propertyKey_2,
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
          playerData = functionContext2[0];
          gameInstance = functionContext2[0].game;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          config_2.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (methodName) => playerData[methodName] instanceof Function,
              ) || config_2.setFlash;
          config_2.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof playerData[shadowKey]?.shadow !== "undefined",
            ) || config_2.terrainManager;
          config_2.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || config_2.entityManager;
          config_2.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[config_2.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            config_2.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof playerData?.[config_2.entityManager]?.[
                      entityKey
                    ]?.[0] !== "undefined",
                ) || config_2.entityManagerProps.animalsList;
            if (
              typeof config_2.entityManagerProps.animalsList !== "undefined"
            ) {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          config_2.socketManager =
            getAllPropertyNames(gameInstance).find(
              (packetSenderKey) =>
                typeof gameInstance[packetSenderKey]?.sendBytePacket !==
                "undefined",
            ) || config_2.socketManager;
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
  if (isProcessed_2) {
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
    if (config_2.setFlash) {
      playerData[config_2.setFlash] = () => {};
    }
    if (config_2.terrainManager) {
      const terrainManager = playerData[config_2.terrainManager];
      if (terrainManager && terrainManager.shadow) {
        terrainManager.shadow.setShadowSize(1000000);
        terrainManager.shadow.setShadowSize = () => {};
      }
    }
  } catch (url) {
    console.error(url);
  }
  isProcessed_2 = true;
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
    event.key === state.activeKey &&
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

export const state = {
  entityTrailInterval: null,
  isToggled: false,
  angleIndex: 0,
  isToggled_2: false,
  activeKey: "Shift",
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
  gameInstance,
  playerData,
  isProcessed_2,
  config,
};
