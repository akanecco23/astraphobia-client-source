import { showToast } from "./ui/interaction.js";
import { handleAnimalAction } from "./features/autofarm.js";
import { togglePanels } from "./ui/panels.js";
import { initHooks } from "./features/entitytrail.js";
import { initAdBlocker } from "./features/adblock.js";

let privateStateMap = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  privateStateMap.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}

let isInitialized = false;
function setupTextEncoderHook(unusedParam) {
  if (isInitialized) {
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
  isInitialized = true;
  if (unusedParam) {
    unusedParam.textContent = "Special Characters Active";
    unusedParam.disabled = true;
    unusedParam.style.opacity = "0.6";
    unusedParam.style.cursor = "not-allowed";
  }
  showToast("✅ Special Characters enabled! (One-time use)");
}

const angleSteps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const orbitRadius = 300;

let isRunning = false;
let isInitialized_2 = false;
const encryptPacketData = (message, terminatorCode, suffix = "") => {
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
    message,
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
const securityConfig = {
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
  if (
    coreSharedState.gameInstance &&
    coreSharedState.globalState &&
    state.socketManager
  ) {
    coreSharedState.gameInstance[state.socketManager].sendBytePacket(
      encryptPacketData(
        coreSharedState.globalState.token,
        payload,
        additionalData,
      ),
    );
  }
};
const state = {};
const counter = 0;
const disableZoomClamp = () => {
  if (isRunning) {
    return;
  }
  setInterval(() => {
    try {
      coreSharedState.gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      coreSharedState.gameInstance.viewport.plugins.plugins.clamp = null;
      coreSharedState.gameInstance.viewport.plugins.plugins["clamp-zoom"] =
        null;
    } catch {}
  }, 300);
  isRunning = true;
};
const initGameCheats = () => {
  if (isInitialized_2) {
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
        if (!coreSharedState.playerData?.myAnimals?.[0]) {
          return;
        }
        const visibleFishLevel =
          coreSharedState.playerData.myAnimals[0].visibleFishLevel;
        const fishLevelConfig = {
          ...securityConfig.default,
          ...securityConfig[visibleFishLevel],
        };
        if (animalsProcessHandler.ctrlKey) {
          if (animalsProcessHandler.shiftKey && visibleFishLevel === 107) {
            sendActionSequence();
            return;
          } else if (
            animalsProcessHandler.shiftKey &&
            visibleFishLevel !== 101 &&
            coreSharedState.playerData.myAnimals[0]._standing
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
            let keyMap = Object.getOwnPropertyNames(
              coreSharedState.gameInstance,
            )
              .map((serviceKey) => coreSharedState.gameInstance[serviceKey])
              .find((keyCollection) => keyCollection.keys instanceof Array);
            if (keyMap) {
              keyMap.pointerDown = true;
              keyMap.pressElapsed = Infinity;
              keyMap.setPointerDown(false);
            }
          }
        } else if (animalsProcessHandler.altKey) {
          handleAnimalAction(
            coreSharedState.playerData?.myAnimals?.[0]?._standing
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
  isInitialized_2 = true;
};

document.addEventListener("keydown", (keyboardEvent) => {
  if (
    keyboardEvent.key === coreSharedState.pressedKey &&
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

export const coreSharedState = {
  updateInterval: null,
  isProcessing: false,
  rotationInterval: null,
  angleIndex: 0,
  gameInstance: null,
  globalState: null,
  playerData: null,
  pressedKey: "Shift",
};

export {
  wrapWithProxy,
  setupTextEncoderHook,
  encryptPacketData,
  sendPacket,
  disableZoomClamp,
  initGameCheats,
  privateStateMap,
  angleSteps,
  orbitRadius,
  isInitialized_2,
  securityConfig,
  state,
};
