function initializeApplication(loopLimit) {
  let resultString = "";
  for (let currentIndex = 0; currentIndex < loopLimit; currentIndex++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
function initializeApplication_2(selector, elements) {
  const targetElement = document.querySelector(selector);
  if (!targetElement) {
    return false;
  }
  targetElement.focus();
  targetElement.value = "";
  let index = 0;
  const initializeApplication = () => {
    if (index >= elements.length) {
      targetElement.dispatchEvent(new Event("change", {
        bubbles: true
      }));
      targetElement.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      setTimeout(() => {}, 100);
      return;
    }
    targetElement.value += elements[index];
    targetElement.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    index++;
    setTimeout(initializeApplication, 25);
  };
  initializeApplication();
  return true;
}
let stateCache = new WeakMap();
function wrapPropertyWithProxy(targetObject, propertyName, proxyHandler) {
  const originalValue = targetObject[propertyName];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyName] = proxyValue;
}
function initializeApplication_3() {
  const adSelectors = ["div.ad-block", "a[href*=\"ad\"]", "iframe[src*=\"ads\"], iframe[src*=\"googlead\"]", ".advertisement", "[class*=\"ads\"], [class*=\"ad-\"]", "[id*=\"ad\"], [id*=\"banner\"]", ".sidebar.left > a", ".sidebar.left > div:not(.sidebar-content)", "div.sidebar.left > div:has(> iframe)", "div.sidebar.left > div:has(> a[href*=\"doubleclick\"]"];
  const initializeApplication = () => {
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(overlayElement => {
        overlayElement.style.display = "none !important";
        overlayElement.style.opacity = "0 !important";
        overlayElement.style.pointerEvents = "none !important";
        overlayElement.style.visibility = "hidden !important";
        overlayElement.removeAttribute("src");
        overlayElement.remove();
      });
    });
    const leftSidebarElement = document.querySelector("div.sidebar.left");
    if (leftSidebarElement) {
      leftSidebarElement.style.maxWidth = "30vw";
      leftSidebarElement.style.width = "21rem";
      leftSidebarElement.style.bottom = "0 !important";
      leftSidebarElement.style.overflow = "hidden";
    }
  };
  initializeApplication();
  const domObserver = new MutationObserver(initializeApplication);
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
  setInterval(initializeApplication, 5000);
  initializeApplication_11("🛡️ Built-in Ad Blocker activated!");
}
let entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2 = null;
let isToggled_4_4_4_4_4_3_4_3_3_3_2_4_3_3_3_2_4_3_3_3_2_2_2_4_3_3_3_2_2_2 = false;
function startRepeatingTask(taskData, intervalSeconds) {
  if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2) {
    clearInterval(entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2);
  }
  isToggled_4_4_4_4_4_3_4_3_3_3_2_4_3_3_3_2_4_3_3_3_2_2_2_4_3_3_3_2_2_2 = true;
  entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2 = setInterval(() => {
    initializeApplication_4(taskData);
  }, intervalSeconds * 1000);
}
function stopEntityTrail() {
  if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2) {
    clearInterval(entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2);
    entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2 = null;
  }
  isToggled_4_4_4_4_4_3_4_3_3_3_2_4_3_3_3_2_4_3_3_3_2_2_2_4_3_3_3_2_2_2 = false;
}
function initializeApplication_4(messageList) {
  const chatInputElement = document.querySelector(".chat-input input") || document.querySelector("input[placeholder*=\"chat\" i]") || document.querySelector("input[type=\"text\"]");
  if (!chatInputElement) {
    console.warn("Chat input not found - skipping auto chat");
    return;
  }
  chatInputElement.focus();
  chatInputElement.value = "";
  let currentIndex = 0;
  const initializeApplication = () => {
    if (currentIndex >= messageList.length) {
      const sendButton = document.querySelector(".chat-input button") || document.querySelector("button[aria-label*=\"send\" i]") || document.querySelector("button");
      if (sendButton) {
        sendButton.click();
      } else {
        chatInputElement.dispatchEvent(new Event("change", {
          bubbles: true
        }));
        chatInputElement.dispatchEvent(new Event("input", {
          bubbles: true
        }));
        setTimeout(() => {
          chatInputElement.value = "";
          chatInputElement.blur();
        }, 100);
      }
      return;
    }
    chatInputElement.value += messageList[currentIndex];
    chatInputElement.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    currentIndex++;
    setTimeout(initializeApplication, 25);
  };
  initializeApplication();
}
let isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3 = false;
function initializeApplication_5(gameInstance) {
  if (isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3) {
    return;
  }
  function initializeApplication(isInitialized) {
    if (typeof isInitialized !== "string") {
      return isInitialized;
    }
    return isInitialized.replace(/\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g, (decoderContext, encodedInput, firstHexParam, secondHexParam, thirdHexParam) => {
      switch (encodedInput[0]) {
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
          return String.fromCharCode(Number.parseInt(encodedInput, 8) || 0);
        default:
          if (firstHexParam != null) {
            return String.fromCharCode(Number.parseInt(firstHexParam, 16) || 0);
          }
          if (secondHexParam != null) {
            return String.fromCharCode(Number.parseInt(secondHexParam, 16) || 0);
          }
          if (thirdHexParam != null) {
            const decodedCharCode = Number.parseInt(thirdHexParam, 16) || 0;
            if (decodedCharCode > 1114111) {
              return decoderContext;
            } else {
              return String.fromCodePoint(decodedCharCode);
            }
          }
          return encodedInput;
      }
    });
  }
  const actionCosts = {
    spawn: 22,
    createTribe: 5,
    chat: 100
  };
  const encodeText = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...args) {
    try {
      const regexPatterns = [/^(\x14{3}\d+\|6\|)(.+)$/gm, /^(\x14{3}\d+\|8\|)(.+)$/gm, /^(\x14{3}\d+\|14\|)(.+)$/gm, /^(\x13{3}[01])(.+)$/gm];
      for (let patternIndex = 0; patternIndex < regexPatterns.length; patternIndex++) {
        const matchResult = regexPatterns[patternIndex].exec(args[0]);
        if (matchResult && matchResult.length === 3) {
          const payloadLengthLimit = [actionCosts.spawn, actionCosts.spawn, actionCosts.createTribe, actionCosts.chat][patternIndex];
          args[0] = matchResult[1] + initializeApplication(matchResult[2]).substr(0, payloadLengthLimit);
          break;
        }
      }
    } catch {}
    return Reflect.apply(encodeText, this, args);
  };
  const uiMutationObserver = new MutationObserver(() => {
    document.querySelector(".play-game .el-input__inner")?.setAttribute("maxlength", "80");
    document.querySelector(".new-tribe .el-input__inner")?.setAttribute("maxlength", "20");
    document.querySelector(".chat-input input")?.setAttribute("maxLength", "1000");
  });
  uiMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3 = true;
  if (gameInstance) {
    gameInstance.textContent = "Special Characters Active";
    gameInstance.disabled = true;
    gameInstance.style.opacity = "0.6";
    gameInstance.style.cursor = "not-allowed";
  }
  initializeApplication_11("✅ Special Characters enabled! (One-time use)");
}
let entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2 = null;
let angleIndex = 0;
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
function initializeApplication_6() {
  return document.querySelector("#gameCanvas") || document.querySelector("canvas") || document.querySelector("#canvas-container canvas");
}
function initializeApplication_7() {
  if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2) {
    return;
  }
  const isInitialized = initializeApplication_6();
  if (!isInitialized) {
    initializeApplication_11("Game canvas not found!");
    return;
  }
  entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2 = setInterval(() => {
    const radius = angles[angleIndex];
    const angleInRadians = Math.PI * 2 * radius / 360;
    const xOffset = Math.round(radius * Math.sin(angleInRadians));
    const yOffset = Math.round(radius * Math.cos(angleInRadians));
    isInitialized.dispatchEvent(new MouseEvent("pointermove", {
      clientX: window.innerWidth / 2 + xOffset,
      clientY: window.innerHeight / 2 + yOffset,
      bubbles: true
    }));
    angleIndex = (angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail_2() {
  if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2) {
    clearInterval(entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2);
    entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2 = null;
  }
}
function initializeApplication_8() {
  if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2) {
    stopEntityTrail_2();
  } else {
    initializeApplication_7();
  }
}
let gameInstance;
let appState;
let playerData;
let isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_2 = false;
let isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_3 = false;
const initializeApplication_9 = (isInputValid, charCode, encodedString = "") => {
  const stringFragments = ["ode", "eat", "fr", "bite", "eng", "enc", "the", "code", "rep", "L", "en", "setter"];
  if (!isInputValid) {
    return null;
  }
  const inputData = ((text1, text1_2) => {
    const textEncoder = new TextEncoder();
    const encodedText1 = textEncoder[stringFragments[5] + stringFragments[0]](text1);
    const encodedText1_2 = textEncoder[stringFragments[10] + stringFragments[7]](text1_2);
    const buffer = new Uint8Array(encodedText1["l" + stringFragments[4] + stringFragments[6].slice(0, 2)]);
    for (let i = 0; i < encodedText1.length; i++) {
      buffer[i] = encodedText1[i] ^ encodedText1_2[i % encodedText1_2["" + stringFragments[9].toLowerCase() + stringFragments[10] + "g" + stringFragments[6].slice(0, 2)]];
    }
    return btoa(String.fromCharCode(...buffer));
  })(String.fromCharCode(charCode)[stringFragments[8] + stringFragments[1]](3) + encodedString, isInputValid);
  const encodedData = new TextEncoder()[stringFragments[5] + stringFragments[0]](inputData);
  const bufferLength = 1 + encodedData.byteLength + 1;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, 25);
  new Uint8Array(arrayBuffer)[stringFragments[11].slice(0, 9 / 27 * 9)](encodedData, 1);
  dataView.setUint8(bufferLength - 1, charCode);
  return arrayBuffer;
};
const config = {
  93: {
    hasSec: true,
    secLoadTime: 750
  },
  107: {
    hasSec: true,
    secLoadTime: 750,
    hasScaling: true
  },
  default: {
    hasSec: false,
    secLoadTime: 500,
    hasScaling: false
  }
};
const startRepeatingTask_2 = (payloadData, callbackFunction = "") => {
  if (gameInstance && appState && config_2.socketManager) {
    gameInstance[config_2.socketManager].sendBytePacket(initializeApplication_9(appState.token, payloadData, callbackFunction));
  }
};
const initializeApplication_10 = iterationIndex => {
  const initialIndex = 1;
  const minLevel = 4;
  const maxLevel = 5;
  try {
    const fishConfig = {
      ...config.default,
      ...(config[playerData?.myAnimals?.[0]?.visibleFishLevel] || {})
    };
    if (iterationIndex < (playerData?.myAnimals?.[0]?._standing ? 40 : 100)) {
      return startRepeatingTask_2(initialIndex);
    }
    if (playerData?.myAnimals?.[0]?._standing) {
      return startRepeatingTask_2(maxLevel, iterationIndex);
    }
    if (fishConfig.hasScaling) {
      return startRepeatingTask_2(maxLevel, iterationIndex);
    }
    if (fishConfig.hasSec) {
      return startRepeatingTask_2(minLevel, iterationIndex);
    }
    return startRepeatingTask_2(initialIndex);
  } catch {}
};
const getAllPropertyNames = targetObject => {
  return [...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)), ...Object.getOwnPropertyNames(targetObject)];
};
const config_2 = {};
let currentTime = 0;
function initializeApplication_11(textContent) {
  const containerElement = document.createElement("div");
  containerElement.style.cssText = "position: fixed; top: 20px; right: 20px; background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 15px; border-radius: 5px; z-index: 10001; font-size: 14px; opacity: 0; transition: opacity 0.3s; pointer-events: none;";
  containerElement.textContent = textContent;
  document.body.appendChild(containerElement);
  setTimeout(() => {
    containerElement.style.opacity = "1";
  }, 10);
  setTimeout(() => {
    containerElement.style.opacity = "0";
    setTimeout(() => containerElement.remove(), 300);
  }, 3000);
}
const initializeApplication_12 = () => {
  const propertyCache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapProperty = (state, key, value) => {
    const wrappedValue = new ProxyConstructor(state[key], value);
    stateCache.set(wrappedValue, state[key]);
    state[key] = wrappedValue;
  };
  wrapProperty(Function.prototype, "toString", {
    apply(thisContext, key_2, context) {
      return propertyCache.apply(thisContext, stateCache.get(key_2) || key_2, context);
    }
  });
  wrapProperty(window, "Proxy", {
    construct(function Object() { [native code] }, constructorArgs) {
      const instance = propertyCache.construct(function Object() { [native code] }, constructorArgs);
      return instance;
    }
  });
  wrapProperty(ProxyConstructor, "revocable", {
    apply(targetFunction, functionArgs, functionContext) {
      const functionResult = propertyCache.apply(targetFunction, functionArgs, functionContext);
      return functionResult;
    }
  });
  let lastExecutionTimestamp = 0;
  wrapProperty(Function.prototype, "bind", {
    apply(targetFunction_2, functionArgs_2, functionContext_2) {
      try {
        try {
          if (lookupGetter.call(functionContext_2[0], "aboveBgPlatformsContainer") != null) {
            return propertyCache.apply(targetFunction_2, functionArgs_2, functionContext_2);
          }
        } catch {}
        if (functionContext_2[0] && functionContext_2[0].aboveBgPlatformsContainer != null) {
          playerData = functionContext_2[0];
          gameInstance = functionContext_2[0].game;
          const allPropertyNames = getAllPropertyNames(playerData);
          const obfuscatedPropertyNames = allPropertyNames.filter(obfuscatedKey => obfuscatedKey.startsWith("_0x"));
          config_2.setFlash = Object.getOwnPropertyNames(playerData.__proto__.__proto__).filter(obfuscatedName => obfuscatedName.startsWith("_0x")).find(functionKey => playerData[functionKey] instanceof Function) || config_2.setFlash;
          config_2.terrainManager = obfuscatedPropertyNames.find(shadowObjectKey => typeof playerData[shadowObjectKey]?.shadow !== "undefined") || config_2.terrainManager;
          config_2.entityManager = obfuscatedPropertyNames.find(entitiesListKey => typeof playerData[entitiesListKey]?.entitiesList !== "undefined") || config_2.entityManager;
          config_2.entityManagerProps = {};
          const entityManagerProperties = getAllPropertyNames(playerData[config_2.entityManager]);
          const animalSyncInterval = setInterval(() => {
            config_2.entityManagerProps.animalsList = entityManagerProperties.filter(variableName => variableName.startsWith("_0x")).find(entityType => typeof playerData?.[config_2.entityManager]?.[entityType]?.[0] !== "undefined") || config_2.entityManagerProps.animalsList;
            if (typeof config_2.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalSyncInterval);
            }
          }, 1000);
          config_2.socketManager = getAllPropertyNames(gameInstance).find(packetSenderKey => typeof gameInstance[packetSenderKey]?.sendBytePacket !== "undefined") || config_2.socketManager;
          try {
            appState = document.getElementById("app")._vnode.appContext.config.globalProperties.$simpleState.states.find(gameStore => gameStore._storeMeta.id === "game");
          } catch {}
          let gameLoopInterval;
          try {
            clearInterval(gameLoopInterval);
          } catch {}
          gameLoopInterval = setInterval(() => {
            try {
              if (!playerData?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = playerData.myAnimals[0];
              if (myAnimal.fadingTrail) {
                const fadingTrailProto = Object.getPrototypeOf(myAnimal.fadingTrail);
                wrapPropertyWithProxy(fadingTrailProto, "enable", {
                  apply() {}
                });
              }
              if (myAnimal.bubblesEmitter) {
                const bubblesEmitterProto = Object.getPrototypeOf(myAnimal.bubblesEmitter);
                Object.defineProperty(bubblesEmitterProto, "emit", {
                  set: () => {}
                });
              }
              clearInterval(gameLoopInterval);
            } catch {}
          }, 200);
          if (lastExecutionTimestamp < Date.now() - 3000) {
            initializeApplication_11("✅ Astraphobia client loaded in game");
            lastExecutionTimestamp = Date.now();
          }
          initializeApplication_13();
          initializeApplication_14();
        }
      } catch {}
      return propertyCache.apply(targetFunction_2, functionArgs_2, functionContext_2);
    }
  });
};
const initializeApplication_13 = () => {
  if (isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_2) {
    return;
  }
  setInterval(() => {
    try {
      gameInstance.viewport.clampZoom({
        minWidth: 0,
        maxWidth: 10000000
      });
      gameInstance.viewport.plugins.plugins.clamp = null;
      gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
    } catch {}
  }, 300);
  isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_2 = true;
};
const initializeApplication_14 = () => {
  if (isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_3) {
    return;
  }
  function initializeSystem() {
    try {
      initializeApplication_10(1);
      setTimeout(() => {
        initializeApplication_10(5000);
      }, 50);
      setTimeout(() => {
        initializeApplication_10(5000);
      }, 100);
      setTimeout(() => {
        initializeApplication_10(5000);
      }, 150);
    } catch {}
  }
  function initializeApplication() {
    try {
      document.getElementById("ctrl-overlay").remove();
    } catch {}
    const containerElement = document.createElement("div");
    const gameContainer = document.querySelector("div.game");
    if (gameContainer) {
      gameContainer.insertBefore(containerElement, gameContainer.children[0]);
    }
    containerElement.outerHTML = "<div id=\"ctrl-overlay\" style=\"width: 100%;height: 100%;position: absolute;display: block;z-index:10000;pointer-events:none;\"></div>";
    document.getElementById("ctrl-overlay").addEventListener("contextmenu", event => event.preventDefault());
  }
  initializeApplication();
  window.addEventListener("click", keyboardEventHandler => {
    try {
      if (!playerData?.myAnimals?.[0]) {
        return;
      }
      const currentFishLevel = playerData.myAnimals[0].visibleFishLevel;
      const fishConfig = {
        ...config.default,
        ...config[currentFishLevel]
      };
      if (keyboardEventHandler.ctrlKey) {
        if (keyboardEventHandler.shiftKey && currentFishLevel === 107) {
          initializeSystem();
          return;
        } else if (keyboardEventHandler.shiftKey && currentFishLevel !== 101 && playerData.myAnimals[0]._standing) {
          initializeApplication_10(Math.floor(Math.random() * 1647483648) + 500000000);
          return;
        } else {
          if (currentFishLevel === 93 && fishConfig.hasSec) {
            initializeApplication_10(1000);
            return;
          }
          let targetModuleInstance = Object.getOwnPropertyNames(gameInstance).map(serviceKey => gameInstance[serviceKey]).find(keyCollection => keyCollection.keys instanceof Array);
          if (targetModuleInstance) {
            targetModuleInstance.pointerDown = true;
            targetModuleInstance.pressElapsed = Infinity;
            targetModuleInstance.setPointerDown(false);
          }
        }
      } else if (keyboardEventHandler.altKey) {
        initializeApplication_10(playerData?.myAnimals?.[0]?._standing ? 41 : Math.floor(fishConfig.secLoadTime / 2));
      }
    } catch {}
  }, false);
  window.addEventListener("keyup", keyboardEvent => {
    try {
      if (!keyboardEvent.ctrlKey && !keyboardEvent.altKey) {
        document.getElementById("ctrl-overlay").style.pointerEvents = "none";
      }
    } catch {}
  }, false);
  window.addEventListener("focus", () => {
    try {
      document.getElementById("ctrl-overlay").style.pointerEvents = "none";
    } catch {}
  });
  isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_3 = true;
};
function injectStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = "\n      #update-history {\n        position: fixed;\n        bottom: 20px;\n        left: 20px;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 12px;\n        font-size: 13px;\n        z-index: 9999;\n        max-width: 220px;\n        max-height: 250px;\n        overflow-y: auto;\n        font-family: 'Segoe UI', sans-serif;\n        cursor: move;\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n      }\n      #update-history:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #update-history ul {\n        margin: 0;\n        padding-left: 15px;\n      }\n      #update-history li {\n        margin-bottom: 5px;\n        line-height: 1.3;\n      }\n      #update-history h3 {\n        margin: 0 0 10px 0;\n        font-size: 14px;\n        color: #ff4d4d;\n        position: relative;\n        padding-right: 25px;\n        text-shadow: 0 0 8px rgba(255,77,77,0.3);\n        font-weight: 700;\n      }\n      #update-history button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #update-history button.min-btn:hover {\n        color: #ff6666;\n      }\n    ";
  document.head.appendChild(styleElement);
  const historyContainer = document.createElement("div");
  historyContainer.id = "update-history";
  historyContainer.innerHTML = "\n      <h3>Update History <button class=\"min-btn\" id=\"minHist\">−</button></h3>\n      <div id=\"historyContent\">\n        <ul>\n          <li>v1.1 - Added built-in ad blocker, removed boost trail, spoofing for username, keybind selector for auto spin, added settings GUI, added shift keybind to toogle all panels.</li>\n          <li>v1.0 - Initial release with auto chat, auto-spin, special character bypass, and thresher super boost, no-zoom limit is automatically enabled.</li>\n        </ul>\n      </div>\n    ";
  document.body.appendChild(historyContainer);
  const minimizedHistoryButton = historyContainer.querySelector("#minHist");
  const historyContentArea = historyContainer.querySelector("#historyContent");
  let isMinimized = false;
  minimizedHistoryButton.onclick = event => {
    event.stopPropagation();
    isMinimized = !isMinimized;
    historyContentArea.style.display = isMinimized ? "none" : "block";
    historyContainer.style.height = isMinimized ? "50px" : "auto";
    minimizedHistoryButton.textContent = isMinimized ? "+" : "−";
  };
  let dragOffsetX;
  let dragOffsetY;
  let isDragging = false;
  let isResizing = false;
  historyContainer.addEventListener("mousedown", clickEvent => {
    if (["BUTTON", "INPUT", "TEXTAREA", "A"].includes(clickEvent.target.tagName)) {
      return;
    }
    isDragging = true;
    isResizing = false;
    dragOffsetX = clickEvent.clientX - historyContainer.getBoundingClientRect().left;
    dragOffsetY = clickEvent.clientY - historyContainer.getBoundingClientRect().top;
    historyContainer.style.transition = "none";
    const initializeApplication = currentEvent => {
      const deltaX = currentEvent.clientX - clickEvent.clientX;
      const deltaY = currentEvent.clientY - clickEvent.clientY;
      if (!isResizing && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isResizing = true;
      }
      if (isDragging) {
        historyContainer.style.left = currentEvent.clientX - dragOffsetX + "px";
        historyContainer.style.top = currentEvent.clientY - dragOffsetY + "px";
        historyContainer.style.bottom = "auto";
        historyContainer.style.right = "auto";
      }
    };
    const initializeApplication_2 = () => {
      isDragging = false;
      historyContainer.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", initializeApplication);
      document.removeEventListener("mouseup", initializeApplication_2);
    };
    document.addEventListener("mousemove", initializeApplication);
    document.addEventListener("mouseup", initializeApplication_2);
  });
  historyContainer.addEventListener("click", interactionEvent => {
    if (isResizing) {
      interactionEvent.stopImmediatePropagation();
    }
  });
  return historyContainer;
}
function injectStyles_2() {
  const styleElement = document.createElement("style");
  styleElement.textContent = "\n      #deep-tools-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n      }\n      #deep-tools-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #deep-tools-panel textarea {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #deep-tools-panel textarea:focus {\n        outline: none;\n        border-color: #ff4d4d;\n        box-shadow: 0 0 0 2px rgba(255,77,77,0.3);\n      }\n      #deep-tools-panel input[type=\"number\"] {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #deep-tools-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n      }\n      #deep-tools-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #deep-tools-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #deep-tools-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #deep-tools-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #deep-tools-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n      #deep-tools-panel .credits {\n        margin-top: 10px;\n        font-size: 10px;\n        color: #777;\n        line-height: 1.3;\n      }\n      #deep-tools-panel .auto-chat-controls {\n        display: flex;\n        gap: 5px;\n        margin-bottom: 8px;\n        align-items: center;\n        justify-content: center;\n      }\n      #deep-tools-panel .spin-keybind {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #deep-tools-panel .spin-keybind label {\n        color: #eee;\n      }\n      #deep-tools-panel #spinKeyInput {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 50px;\n        text-align: center;\n      }\n      #aim-overlay, #ctrl-overlay {\n        z-index: 10000 !important;\n      }\n      div.game {\n        position: relative;\n      }\n      /* Ad Removal */\n      div.sidebar.left > div.ad-block {\n        opacity: 0 !important;\n        pointer-events: none !important;\n        display: none !important;\n      }\n      div.sidebar.left > a {\n        display: none !important;\n      }\n      div.sidebar.left {\n        max-width: 30vw;\n        width: 21rem;\n        bottom: 0 !important;\n      }\n    ";
  document.head.appendChild(styleElement);
  const mainPanel = document.createElement("div");
  mainPanel.id = "deep-tools-panel";
  mainPanel.style.position = "fixed";
  mainPanel.style.bottom = "20px";
  mainPanel.style.right = "20px";
  mainPanel.style.color = "#e0e0e0";
  mainPanel.style.padding = "14px";
  mainPanel.style.borderRadius = "12px";
  mainPanel.style.fontSize = "14px";
  mainPanel.style.zIndex = "99999";
  mainPanel.style.userSelect = "none";
  mainPanel.style.width = "220px";
  mainPanel.style.textAlign = "center";
  mainPanel.style.cursor = "move";
  mainPanel.style.overflow = "hidden";
  mainPanel.innerHTML = "\n      <div style=\"font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;\">\n        ASTRAPHOBIA CLIENT\n        <button class=\"min-btn\" id=\"minPanel\">−</button>\n      </div>\n      <div id=\"panelContent\">\n        <textarea id=\"chatMsg\" placeholder=\"Type message...\" style=\"width:100%; height:45px; margin-bottom:10px; resize:none;\"></textarea>\n        <button id=\"sendBtn\" style=\"width:100%; margin-bottom:8px;\">Send Typed Chat</button>\n        <div class=\"auto-chat-controls\">\n          <input type=\"number\" id=\"delayInput\" min=\"1\" max=\"300\" value=\"10\" style=\"margin-right:5px;\">\n          <span style=\"font-size:12px;\">sec</span>\n        </div>\n        <button id=\"autoChatBtn\" style=\"width:100%; margin-bottom:8px;\">Enable Auto Chat</button>\n        <button id=\"patchBtn\" style=\"width:100%; margin-bottom:8px;\">Enable Special Characters(in chat/clan/name)</button>\n        <button id=\"spoofBtn\" style=\"width:100%; margin-bottom:8px;\">Spoof Username:Random Unicode Name(ban decrease)</button>\n        <button id=\"spinBtn\" style=\"width:100%; margin-bottom:8px;\">Enable Auto Spin</button>\n        <div class=\"spin-keybind\">\n          <label for=\"spinKeyInput\">Keybind:</label>\n          <input type=\"text\" id=\"spinKeyInput\" placeholder=\"Press key...\" readonly>\n        </div>\n        <div class=\"credits\">\n          Coder: Astraphobia<br>\n          Owner: Astraphobia<br>\n          Designer: Astraphobia<br>\n          Tester: Astraphobia\n        </div>\n      </div>\n    ";
  document.body.appendChild(mainPanel);
  const minimizedPanel = mainPanel.querySelector("#minPanel");
  const panelContent = mainPanel.querySelector("#panelContent");
  let isPanelHidden = false;
  minimizedPanel.onclick = clickEvent => {
    clickEvent.stopPropagation();
    isPanelHidden = !isPanelHidden;
    panelContent.style.display = isPanelHidden ? "none" : "block";
    mainPanel.style.height = isPanelHidden ? "50px" : "auto";
    minimizedPanel.textContent = isPanelHidden ? "+" : "−";
  };
  mainPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = mainPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      initializeApplication_4(chatMessage);
    }
  };
  const patchButton = mainPanel.querySelector("#patchBtn");
  patchButton.onclick = () => initializeApplication_5(patchButton);
  const spoofButton = mainPanel.querySelector("#spoofBtn");
  spoofButton.onclick = () => {
    const generatedId = initializeApplication(8);
    if (initializeApplication_2(".play-game .el-input__inner", generatedId)) {
      initializeApplication_11("Spoofed name!");
    } else if (initializeApplication_2(".new-tribe .el-input__inner", generatedId)) {
      initializeApplication_11("Spoofed tribe name!");
    } else {
      initializeApplication_11("No name input found! Enable special characters first.");
    }
  };
  const spinButton = mainPanel.querySelector("#spinBtn");
  spinButton.onclick = () => {
    initializeApplication_8();
    if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2) {
      spinButton.textContent = "Disable Auto Spin";
      spinButton.style.color = "#4dff4d";
    } else {
      spinButton.textContent = "Enable Auto Spin";
      spinButton.style.color = "#ff4d4d";
    }
  };
  const spinKeyInput = mainPanel.querySelector("#spinKeyInput");
  let selectedSpinKey = null;
  spinKeyInput.addEventListener("keydown", keyboardEvent => {
    keyboardEvent.preventDefault();
    selectedSpinKey = keyboardEvent.code || keyboardEvent.key;
    spinKeyInput.value = selectedSpinKey.replace("Key", "").toLowerCase();
  });
  document.addEventListener("keydown", shortcutEvent => {
    if (selectedSpinKey && shortcutEvent.code === selectedSpinKey && !shortcutEvent.target.matches("input, textarea, button")) {
      shortcutEvent.preventDefault();
      initializeApplication_8();
      if (entityTrailInterval_3_3_3_3_3_3_3_3_3_2_2_3_3_3_2_2_3_3_3_2_2_2_2_2_3_3_3_2_2_2_2_2_2) {
        spinButton.textContent = "Disable Auto Spin";
        spinButton.style.color = "#4dff4d";
      } else {
        spinButton.textContent = "Enable Auto Spin";
        spinButton.style.color = "#ff4d4d";
      }
    }
  });
  const autoChatButton = mainPanel.querySelector("#autoChatBtn");
  autoChatButton.onclick = () => {
    const messageContent = mainPanel.querySelector("#chatMsg").value;
    const delayInputElement = mainPanel.querySelector("#delayInput");
    const messageDelay = parseInt(delayInputElement.value) || 10;
    if (!messageContent) {
      initializeApplication_11("⚠️ Enter a message first!");
      return;
    }
    if (isToggled_4_4_4_4_4_3_4_3_3_3_2_4_3_3_3_2_4_3_3_3_2_2_2_4_3_3_3_2_2_2) {
      stopEntityTrail();
      autoChatButton.textContent = "Enable Auto Chat";
      autoChatButton.style.color = "#ff4d4d";
    } else {
      startRepeatingTask(messageContent, messageDelay);
      autoChatButton.textContent = "Disable Auto Chat";
      autoChatButton.style.color = "#4dff4d";
    }
  };
  let dragOffsetX;
  let dragOffsetY;
  let isInitialized = false;
  let isLoading = false;
  mainPanel.addEventListener("mousedown", interactionEvent => {
    if (interactionEvent.target.tagName === "BUTTON" || interactionEvent.target.tagName === "TEXTAREA" || interactionEvent.target.tagName === "INPUT" || interactionEvent.target.classList.contains("credits")) {
      return;
    }
    isInitialized = true;
    isLoading = false;
    dragOffsetX = interactionEvent.clientX - mainPanel.getBoundingClientRect().left;
    dragOffsetY = interactionEvent.clientY - mainPanel.getBoundingClientRect().top;
    mainPanel.style.transition = "none";
    const initializeApplication = currentEvent => {
      const deltaX = currentEvent.clientX - interactionEvent.clientX;
      const deltaY = currentEvent.clientY - interactionEvent.clientY;
      if (!isLoading && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isLoading = true;
      }
      if (isInitialized) {
        mainPanel.style.left = currentEvent.clientX - dragOffsetX + "px";
        mainPanel.style.top = currentEvent.clientY - dragOffsetY + "px";
        mainPanel.style.bottom = "auto";
        mainPanel.style.right = "auto";
      }
    };
    const initializeApplication_2 = () => {
      isInitialized = false;
      mainPanel.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", initializeApplication);
      document.removeEventListener("mouseup", initializeApplication_2);
    };
    document.addEventListener("mousemove", initializeApplication);
    document.addEventListener("mouseup", initializeApplication_2);
  });
  mainPanel.addEventListener("click", propagationEvent => {
    if (isLoading) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  return mainPanel;
}
function injectStyles_3() {
  const styleElement = document.createElement("style");
  styleElement.textContent = "\n      #plus-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n      }\n      #plus-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #plus-panel textarea {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 6px;\n        padding: 8px;\n        transition: border-color 0.2s;\n        font-size: 13px;\n      }\n      #plus-panel textarea:focus {\n        outline: none;\n        border-color: #ff4d4d;\n        box-shadow: 0 0 0 2px rgba(255,77,77,0.3);\n      }\n      #plus-panel input[type=\"number\"] {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 60px;\n        text-align: center;\n      }\n      #plus-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #plus-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #plus-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #plus-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #plus-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #plus-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n    ";
  document.head.appendChild(styleElement);
  const containerElement = document.createElement("div");
  containerElement.id = "plus-panel";
  containerElement.style.position = "fixed";
  containerElement.style.top = "20px";
  containerElement.style.right = "20px";
  containerElement.style.color = "#e0e0e0";
  containerElement.style.padding = "14px";
  containerElement.style.borderRadius = "12px";
  containerElement.style.fontSize = "14px";
  containerElement.style.zIndex = "99999";
  containerElement.style.userSelect = "none";
  containerElement.style.width = "220px";
  containerElement.style.textAlign = "center";
  containerElement.style.cursor = "move";
  containerElement.style.overflow = "hidden";
  containerElement.innerHTML = "\n      <div style=\"font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;\">\n        ASTRAPHOBIA CLIENT\n        <button class=\"min-btn\" id=\"minPlus\">−</button>\n      </div>\n      <div id=\"plusContent\">\n        <button id=\"thresherBtn\">Enable Thresher Super Boost(ctrl + shift and click)(minumum required 2 boost)</button>\n      </div>\n    ";
  document.body.appendChild(containerElement);
  const minimizeButton = containerElement.querySelector("#minPlus");
  const contentContainer = containerElement.querySelector("#plusContent");
  let isMinimized = false;
  minimizeButton.onclick = eventHandler => {
    eventHandler.stopPropagation();
    isMinimized = !isMinimized;
    contentContainer.style.display = isMinimized ? "none" : "block";
    containerElement.style.height = isMinimized ? "50px" : "auto";
    minimizeButton.textContent = isMinimized ? "+" : "−";
  };
  const actionButton = containerElement.querySelector("#thresherBtn");
  actionButton.onclick = () => {
    if (isProcessed_9_9_9_9_9_7_9_7_7_6_3_9_7_7_6_3_9_7_7_6_3_3_3_3_9_7_7_6_3_3_3_3_3) {
      initializeApplication_11("Thresher Super Boost is already active!");
      return;
    }
    initializeApplication_12();
    actionButton.textContent = "Thresher Super Boost Active";
    actionButton.style.color = "#4dff4d";
    actionButton.disabled = true;
  };
  let dragOffsetX;
  let dragOffsetY;
  let isDragging = false;
  let isResizing = false;
  containerElement.addEventListener("mousedown", clickEvent => {
    if (clickEvent.target.tagName === "BUTTON" || clickEvent.target.tagName === "TEXTAREA" || clickEvent.target.tagName === "INPUT" || clickEvent.target.classList.contains("credits")) {
      return;
    }
    isDragging = true;
    isResizing = false;
    dragOffsetX = clickEvent.clientX - containerElement.getBoundingClientRect().left;
    dragOffsetY = clickEvent.clientY - containerElement.getBoundingClientRect().top;
    containerElement.style.transition = "none";
    const initializeApplication = currentMouseEvent => {
      const deltaX = currentMouseEvent.clientX - clickEvent.clientX;
      const deltaY = currentMouseEvent.clientY - clickEvent.clientY;
      if (!isResizing && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isResizing = true;
      }
      if (isDragging) {
        containerElement.style.left = currentMouseEvent.clientX - dragOffsetX + "px";
        containerElement.style.top = currentMouseEvent.clientY - dragOffsetY + "px";
        containerElement.style.bottom = "auto";
        containerElement.style.right = "auto";
      }
    };
    const initializeApplication_2 = () => {
      isDragging = false;
      containerElement.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", initializeApplication);
      document.removeEventListener("mouseup", initializeApplication_2);
    };
    document.addEventListener("mousemove", initializeApplication);
    document.addEventListener("mouseup", initializeApplication_2);
  });
  containerElement.addEventListener("click", inputEvent => {
    if (isResizing) {
      inputEvent.stopImmediatePropagation();
    }
  });
  return containerElement;
}
function injectStyles_4() {
  const styleElement = document.createElement("style");
  styleElement.textContent = "\n      #settings-panel {\n        font-family: 'Segoe UI', sans-serif;\n        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);\n        border: 1px solid #333;\n        background: linear-gradient(to bottom, #0f0f0f, #1a1a1a);\n        position: fixed;\n        top: 20px;\n        left: 20px;\n        color: #e0e0e0;\n        padding: 14px;\n        border-radius: 12px;\n        font-size: 14px;\n        z-index: 99999;\n        user-select: none;\n        width: 220px;\n        text-align: center;\n        cursor: move;\n        overflow: hidden;\n      }\n      #settings-panel:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);\n      }\n      #settings-panel button {\n        background: linear-gradient(to bottom, #222, #111);\n        color: #ff4d4d;\n        border: 1px solid #444;\n        border-radius: 6px;\n        padding: 8px 0;\n        font-weight: 600;\n        font-size: 13px;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        letter-spacing: 0.5px;\n        width: 100%;\n        margin-bottom: 8px;\n      }\n      #settings-panel button:hover:not(:disabled) {\n        background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);\n        border-color: #ff4d4d;\n        transform: translateY(-1px);\n        box-shadow: 0 4px 8px rgba(255,77,77,0.3);\n      }\n      #settings-panel button:active:not(:disabled) {\n        transform: translateY(0);\n        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n      }\n      #settings-panel button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n        transform: none;\n        box-shadow: none;\n      }\n      #settings-panel button.min-btn {\n        background: none;\n        border: none;\n        color: #ff4d4d;\n        font-size: 18px;\n        cursor: pointer;\n        position: absolute;\n        top: 30%;\n        right: 5px;\n        transform: translateY(-50%);\n        z-index: 1;\n        transition: color 0.2s ease;\n        width: 20px;\n        height: 20px;\n        line-height: 20px;\n      }\n      #settings-panel button.min-btn:hover {\n        color: #ff6666;\n      }\n      #settings-panel .keybind-set {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        margin-bottom: 8px;\n        font-size: 12px;\n      }\n      #settings-panel .keybind-set label {\n        color: #eee;\n      }\n      #settings-panel #toggleKeyInput {\n        background: #1a1a1a;\n        border: 1px solid #333;\n        color: #eee;\n        border-radius: 4px;\n        padding: 4px;\n        width: 80px;\n        text-align: center;\n      }\n    ";
  document.head.appendChild(styleElement);
  const settingsContainer = document.createElement("div");
  settingsContainer.id = "settings-panel";
  settingsContainer.innerHTML = "\n      <div style=\"font-weight:700; margin-bottom:10px; color:#ff4d4d; text-shadow: 0 0 8px rgba(255,77,77,0.3); position: relative; height: 40px; line-height: 40px; padding-right: 25px;\">\n        SETTINGS\n        <button class=\"min-btn\" id=\"minSettings\">−</button>\n      </div>\n      <div id=\"settingsContent\">\n        <div class=\"keybind-set\">\n          <label for=\"toggleKeyInput\">Toggle Client:</label>\n          <input type=\"text\" id=\"toggleKeyInput\" placeholder=\"Press key...\" readonly>\n        </div>\n      </div>\n    ";
  document.body.appendChild(settingsContainer);
  const minSettingsButton = settingsContainer.querySelector("#minSettings");
  const settingsContent = settingsContainer.querySelector("#settingsContent");
  let isSettingsHidden = false;
  minSettingsButton.onclick = clickEvent => {
    clickEvent.stopPropagation();
    isSettingsHidden = !isSettingsHidden;
    settingsContent.style.display = isSettingsHidden ? "none" : "block";
    settingsContainer.style.height = isSettingsHidden ? "50px" : "auto";
    minSettingsButton.textContent = isSettingsHidden ? "+" : "−";
  };
  const toggleKeyInput = settingsContainer.querySelector("#toggleKeyInput");
  toggleKeyInput.value = activeKey;
  toggleKeyInput.addEventListener("keydown", keyboardEvent => {
    keyboardEvent.preventDefault();
    activeKey = keyboardEvent.key;
    toggleKeyInput.value = activeKey;
  });
  let dragOffsetX;
  let dragOffsetY;
  let isDragging = false;
  let isInitialized = false;
  settingsContainer.addEventListener("mousedown", inputEvent => {
    if (inputEvent.target.tagName === "BUTTON" || inputEvent.target.tagName === "INPUT" || inputEvent.target.classList.contains("credits")) {
      return;
    }
    isDragging = true;
    isInitialized = false;
    dragOffsetX = inputEvent.clientX - settingsContainer.getBoundingClientRect().left;
    dragOffsetY = inputEvent.clientY - settingsContainer.getBoundingClientRect().top;
    settingsContainer.style.transition = "none";
    const initializeApplication = currentMouseEvent => {
      const deltaX = currentMouseEvent.clientX - inputEvent.clientX;
      const deltaY = currentMouseEvent.clientY - inputEvent.clientY;
      if (!isInitialized && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        isInitialized = true;
      }
      if (isDragging) {
        settingsContainer.style.left = currentMouseEvent.clientX - dragOffsetX + "px";
        settingsContainer.style.top = currentMouseEvent.clientY - dragOffsetY + "px";
        settingsContainer.style.bottom = "auto";
        settingsContainer.style.right = "auto";
      }
    };
    const initializeApplication_2 = () => {
      isDragging = false;
      settingsContainer.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)";
      document.removeEventListener("mousemove", initializeApplication);
      document.removeEventListener("mouseup", initializeApplication_2);
    };
    document.addEventListener("mousemove", initializeApplication);
    document.addEventListener("mouseup", initializeApplication_2);
  });
  settingsContainer.addEventListener("click", propagationEvent => {
    if (isInitialized) {
      propagationEvent.stopImmediatePropagation();
    }
  });
  return settingsContainer;
}
let activeKey = "Shift";
function initializeApplication_15() {
  const plusPanel_4_4_4_4_4_4_4_4_4 = document.getElementById("deep-tools-panel");
  const plusPanel_4_4_4_4_4_4_4_4_4_2 = document.getElementById("update-history");
  const plusPanel_4_4_4_4_4_4_4_4_4_3 = document.getElementById("settings-panel");
  const plusPanel_4_4_4_4_4_4_4_4_4_4 = document.getElementById("plus-panel");
  const elementDisplayState = plusPanel_4_4_4_4_4_4_4_4_4.style.display;
  const toggledDisplayState = elementDisplayState === "none" ? "block" : "none";
  plusPanel_4_4_4_4_4_4_4_4_4.style.display = toggledDisplayState;
  plusPanel_4_4_4_4_4_4_4_4_4_2.style.display = toggledDisplayState;
  plusPanel_4_4_4_4_4_4_4_4_4_3.style.display = toggledDisplayState;
  plusPanel_4_4_4_4_4_4_4_4_4_4.style.display = toggledDisplayState;
}
function initializeApplication_19() {
  const mainPanel = injectStyles_2();
  const historyPanel = injectStyles();
  const settingsPanel = injectStyles_4();
  const plusPanel = injectStyles_3();
  initializeApplication_3();
  return {
    mainPanel: mainPanel,
    historyPanel: historyPanel,
    settingsPanel: settingsPanel,
    plusPanel: plusPanel
  };
}
document.addEventListener("keydown", keyboardEvent => {
  if (keyboardEvent.key === activeKey && !keyboardEvent.repeat && !keyboardEvent.target.matches("input, textarea, button")) {
    keyboardEvent.preventDefault();
    initializeApplication_15();
  }
});
if (document.body) {
  initializeApplication_19();
} else {
  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      initializeApplication_19();
      bodyObserver.disconnect();
    }
  });
  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
window.addEventListener("load", () => {
  setTimeout(() => {
    initializeApplication_12();
    initializeApplication_3();
  }, 1000);
});