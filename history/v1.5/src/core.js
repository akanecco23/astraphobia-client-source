import { showNotification } from "./ui/interaction.js";
import { getAllPropertyNames } from "./utils.js";
import { initControlOverlay, togglePanels } from "./ui/panels.js";
import { initAdBlocker } from "./features/adblock.js";
import { applyHomeBackground } from "./ui/theme.js";

const stateMap = new WeakMap();
function wrapPropertyWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyInstance = new Proxy(originalValue, proxyHandler);
  stateMap.set(proxyInstance, originalValue);
  targetObject[propertyKey] = proxyInstance;
}

let isInitialized = false;
function initInterceptor(config) {
  if (isInitialized) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(
      /\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g,
      (match, escapeSequence, hexPart1, hexPart2, hexPart3) => {
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
            if (hexPart1 != null) {
              return String.fromCharCode(Number.parseInt(hexPart1, 16) || 0);
            }
            if (hexPart2 != null) {
              return String.fromCharCode(Number.parseInt(hexPart2, 16) || 0);
            }
            if (hexPart3 != null) {
              const codePoint = Number.parseInt(hexPart3, 16) || 0;
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
  const actionMap = {
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
          const actionType = [
            actionMap.spawn,
            actionMap.spawn,
            actionMap.createTribe,
            actionMap.chat,
          ][patternIndex];
          inputArgs[0] =
            matchResult[1] +
            unescapeString(matchResult[2]).substr(0, actionType);
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

const angleSteps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
let gameInstance;
let appState;
let playerData;
let isReady = false;

const encryptPacketData = (isEnabled, charCode, suffix = "") => {
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
  if (!isEnabled) {
    return null;
  }
  const plainText = ((inputString, keyString) => {
    const textEncoder = new TextEncoder();
    const encodedInput =
      textEncoder[stringTable[5] + stringTable[0]](inputString);
    const encodedKey = textEncoder[stringTable[10] + stringTable[7]](keyString);
    const resultBuffer = new Uint8Array(
      encodedInput["l" + stringTable[4] + stringTable[6].slice(0, 2)],
    );
    for (let index = 0; index < encodedInput.length; index++) {
      resultBuffer[index] =
        encodedInput[index] ^
        encodedKey[
          index %
            encodedKey[
              "" +
                stringTable[9].toLowerCase() +
                stringTable[10] +
                "g" +
                stringTable[6].slice(0, 2)
            ]
        ];
    }
    return btoa(String.fromCharCode(...resultBuffer));
  })(
    String.fromCharCode(charCode)[stringTable[8] + stringTable[1]](3) + suffix,
    isEnabled,
  );
  const encodedBytes = new TextEncoder()[stringTable[5] + stringTable[0]](
    plainText,
  );
  const bufferLength = 1 + encodedBytes.byteLength + 1;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, 25);
  new Uint8Array(arrayBuffer)[stringTable[11].slice(0, (9 / 27) * 9)](
    encodedBytes,
    1,
  );
  dataView.setUint8(bufferLength - 1, charCode);
  return arrayBuffer;
};
const securityConfigs = {
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
  if (gameInstance && appState && state.socketManager) {
    gameInstance[state.socketManager].sendBytePacket(
      encryptPacketData(appState.token._value, payload, additionalData),
    );
  }
};
const state = {};
const counter = 0;
const initializeAntiTamper = () => {
  const storage = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    storage[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const createProxyHook = (dataStore, storeIndex, storeValue) => {
    const processedValue = new ProxyConstructor(
      dataStore[storeIndex],
      storeValue,
    );
    stateMap.set(processedValue, dataStore[storeIndex]);
    dataStore[storeIndex] = processedValue;
  };
  createProxyHook(Function.prototype, "toString", {
    apply(context, argsKey, extraArg) {
      return storage.apply(context, stateMap.get(argsKey) || argsKey, extraArg);
    },
  });
  createProxyHook(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = storage.construct(constructor, constructorArgs);
      return instance;
    },
  });
  createProxyHook(ProxyConstructor, "revocable", {
    apply(thisArg, args, extraArg2) {
      const result = storage.apply(thisArg, args, extraArg2);
      return result;
    },
  });
  let lastTimestamp = 0;
  createProxyHook(Function.prototype, "bind", {
    apply(thisArg2, args2, extraArg3) {
      try {
        try {
          if (
            lookupGetter.call(extraArg3[0], "aboveBgPlatformsContainer") != null
          ) {
            return storage.apply(thisArg2, args2, extraArg3);
          }
        } catch {}
        if (extraArg3[0] && extraArg3[0].aboveBgPlatformsContainer != null) {
          playerData = extraArg3[0];
          gameInstance = extraArg3[0].game;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(playerData.__proto__.__proto__)
              .filter((obfuscatedPropName) =>
                obfuscatedPropName.startsWith("_0x"),
              )
              .find(
                (methodName) => playerData[methodName] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowEntityKey) =>
                typeof playerData[shadowEntityKey]?.shadow !== "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || state.entityManager;
          state.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            playerData[state.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            state.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityName) =>
                    typeof playerData?.[state.entityManager]?.[
                      entityName
                    ]?.[0] !== "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(gameInstance).find(
              (networkClientKey) =>
                typeof gameInstance[networkClientKey]?.sendBytePacket !==
                "undefined",
            ) || state.socketManager;
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
                const fadingTrailPrototype = Object.getPrototypeOf(
                  myAnimal.fadingTrail,
                );
                wrapPropertyWithProxy(fadingTrailPrototype, "enable", {
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
          initControlOverlay();
        }
      } catch {}
      return storage.apply(thisArg2, args2, extraArg3);
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
    if (state.setFlash) {
      playerData[state.setFlash] = () => {};
    }
    if (state.terrainManager) {
      const terrainManager = playerData[state.terrainManager];
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

document.addEventListener("keydown", (keyboardEvent) => {
  if (
    keyboardEvent.key === coreSharedState.activeKey &&
    !keyboardEvent.repeat &&
    !keyboardEvent.target.matches("input, textarea, button")
  ) {
    keyboardEvent.preventDefault();
    togglePanels();
  }
});
window.addEventListener("load", () => {
  setTimeout(() => {
    initializeAntiTamper();
    initAdBlocker();
    applyHomeBackground();
  }, 1000);
});

export const coreSharedState = {
  updateInterval: null,
  isProcessing: false,
  rotationInterval: null,
  angleIndex: 0,
  isInitialized_2: false,
  isProcessing_2: false,
  activeKey: "Shift",
};

export {
  wrapPropertyWithProxy,
  initInterceptor,
  encryptPacketData,
  sendPacket,
  initializeAntiTamper,
  disableGameRestrictions,
  angleSteps,
  radius,
  gameInstance,
  playerData,
  isReady,
  securityConfigs,
};
