import { showNotification } from "./ui/interaction.js";
import { togglePanels } from "./ui/panels.js";
import { setupProxyHooks } from "./features/antidetection.js";
import { initAdBlocker } from "./features/adblock.js";
import { initBackgroundImage } from "./ui/theme.js";

let stateMap = new WeakMap();
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
  if (state.gameInstance && state.globalState && stateCache.socketManager) {
    state.gameInstance[stateCache.socketManager].sendBytePacket(
      encryptPacketData(state.globalState.token._value, payload, metadata),
    );
  }
};
const stateCache = {};
const counter = 0;
const disableGameRestrictions = () => {
  if (isReady) {
    return;
  }
  if (!state.playerData) {
    setTimeout(disableGameRestrictions, 500);
    return;
  }
  setInterval(() => {
    try {
      state.gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      state.gameInstance.viewport.plugins.plugins.clamp = null;
      state.gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (stateCache.setFlash) {
      state.playerData[stateCache.setFlash] = () => {};
    }
    if (stateCache.terrainManager) {
      const terrainManager = state.playerData[stateCache.terrainManager];
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
  gameInstance: null,
  globalState: null,
  playerData: null,
  isInitialized_2: false,
  isProcessing_2: false,
  currentKey: "Shift",
};

export {
  wrapPropertyWithProxy,
  initPacketInterceptor,
  encryptPacketData,
  sendPacket,
  disableGameRestrictions,
  stateMap,
  rotationAngles,
  orbitRadius,
  isReady,
  securitySettings,
  stateCache,
};
