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

let IsProcessed = false;
function hookTextEncoder(config) {
  if (IsProcessed) {
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
  const plainText = ((v2302PlainText, keyText) => {
    const textEncoder = new TextEncoder();
    const plainTextBytes =
      textEncoder[stringTable[5] + stringTable[0]](v2302PlainText);
    const keyBytes = textEncoder[stringTable[10] + stringTable[7]](keyText);
    const cipherTextBytes = new Uint8Array(
      plainTextBytes["l" + stringTable[4] + stringTable[6].slice(0, 2)],
    );
    for (let v17efI = 0; v17efI < plainTextBytes.length; v17efI++) {
      cipherTextBytes[v17efI] =
        plainTextBytes[v17efI] ^
        keyBytes[
          v17efI %
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
const Config = {
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
  if (gameInstance && State && objConfig.socketManager) {
    gameInstance[objConfig.socketManager].sendBytePacket(
      encryptPacketData(State.token._value, payload, additionalData),
    );
  }
};
const objConfig = {};
const currentTime = 0;
const initHooks = () => {
  const propertyCache = {};
  for (const propName of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propName] = Reflect[propName];
  }
  const ProxyClass = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const createPropertyProxy = (
    v57edTargetObject,
    v260cPropertyKey,
    propertyValue,
  ) => {
    const propertyInstance = new ProxyClass(
      v57edTargetObject[v260cPropertyKey],
      propertyValue,
    );
    stateCache.set(propertyInstance, v57edTargetObject[v260cPropertyKey]);
    v57edTargetObject[v260cPropertyKey] = propertyInstance;
  };
  createPropertyProxy(Function.prototype, "toString", {
    apply(thisContext, v1548PropertyKey, thisArg) {
      return propertyCache.apply(
        thisContext,
        stateCache.get(v1548PropertyKey) || v1548PropertyKey,
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
          objConfig.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((v2144PropName) => v2144PropName.startsWith("_0x"))
              .find(
                (methodName) => playerData[methodName] instanceof Function,
              ) || objConfig.setFlash;
          objConfig.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof playerData[shadowKey]?.shadow !== "undefined",
            ) || objConfig.terrainManager;
          objConfig.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || objConfig.entityManager;
          objConfig.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[objConfig.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            objConfig.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof playerData?.[objConfig.entityManager]?.[
                      entityKey
                    ]?.[0] !== "undefined",
                ) || objConfig.entityManagerProps.animalsList;
            if (
              typeof objConfig.entityManagerProps.animalsList !== "undefined"
            ) {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          objConfig.socketManager =
            getAllPropertyNames(gameInstance).find(
              (packetSenderKey) =>
                typeof gameInstance[packetSenderKey]?.sendBytePacket !==
                "undefined",
            ) || objConfig.socketManager;
          try {
            State = document
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
  if (boolIsProcessed) {
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
    if (objConfig.setFlash) {
      playerData[objConfig.setFlash] = () => {};
    }
    if (objConfig.terrainManager) {
      const terrainManager = playerData[objConfig.terrainManager];
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

function initializePanels() {
  const PanelElement = createDeepToolsPanel();
  const historyPanelElement = createUpdateHistoryPanel();
  const settingsPanelElement = injectSettingsStyles();
  const plusPanelElement = injectPlusPanelStyles();
  initBackgroundImage();
  initAdBlocker();
  return {
    mainPanel: PanelElement,
    historyPanel: historyPanelElement,
    settingsPanel: settingsPanelElement,
    plusPanel: plusPanelElement,
  };
}
document.addEventListener("keydown", (v47fcEvent) => {
  if (
    v47fcEvent.key === state.activeKey &&
    !v47fcEvent.repeat &&
    !v47fcEvent.target.matches("input, textarea, button")
  ) {
    v47fcEvent.preventDefault();
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
  IsToggled: false,
  angleIndex: 0,
  boolIsToggled: false,
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
  boolIsProcessed,
  Config,
};
