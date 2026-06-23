import { showNotification } from "./ui/interaction.js";
import { togglePanels } from "./ui/panels.js";
import { initHooks } from "./features/entitytrail.js";
import { initAdBlocker } from "./features/adblock.js";
import { initBackgroundImage } from "./ui/theme.js";

let stateMap = new WeakMap();
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
  if (coreSharedState.game && coreSharedState.appState && state.socketManager) {
    coreSharedState.game[state.socketManager].sendBytePacket(
      encryptPacketData(
        coreSharedState.appState.token._value,
        payload,
        additionalData,
      ),
    );
  }
};
const state = {};
const counter = 0;
const disableGameRestrictions = () => {
  if (isActive) {
    return;
  }
  if (!coreSharedState.player) {
    setTimeout(disableGameRestrictions, 500);
    return;
  }
  setInterval(() => {
    try {
      coreSharedState.game.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000,
      });
      coreSharedState.game.viewport.plugins.plugins.clamp = null;
      coreSharedState.game.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  try {
    if (state.setFlash) {
      coreSharedState.player[state.setFlash] = () => {};
    }
    if (state.terrainManager) {
      const terrainManager = coreSharedState.player[state.terrainManager];
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
  game: null,
  appState: null,
  player: null,
  isInitialized_2: false,
  isActive_2: false,
  currentKey: "Shift",
};

export {
  wrapWithProxy,
  hookTextEncoder,
  encryptPacketData,
  sendPacket,
  disableGameRestrictions,
  stateMap,
  angles,
  radius,
  isActive,
  securitySettings,
  state,
};
