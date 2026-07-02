function generateRandomString(length) {
  let resultString = "";
  for (let i = 0; i < length; i++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
function typeText(selector, text) {
  const inputElement = document.querySelector(selector);
  if (!inputElement) {
    return false;
  }
  inputElement.focus();
  inputElement.value = "";
  let charIndex = 0;
  const typeChar = () => {
    if (charIndex >= text.length) {
      inputElement.dispatchEvent(new Event("change", {
        bubbles: true
      }));
      inputElement.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      return;
    }
    inputElement.value += text[charIndex];
    inputElement.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    charIndex++;
    setTimeout(typeChar, 25);
  };
  typeChar();
  return true;
}
let stateCache = new WeakMap();
function wrapWithProxy(targetObject, propertyKey, proxyHandler) {
  const originalValue = targetObject[propertyKey];
  const proxyValue = new Proxy(originalValue, proxyHandler);
  stateCache.set(proxyValue, originalValue);
  targetObject[propertyKey] = proxyValue;
}
let currentTrackId = "";
let numCurrentTime = 0;
function showNotification(message) {
  const currentTime = Date.now();
  if (message === currentTrackId && currentTime - numCurrentTime < 3000) {
    return;
  }
  currentTrackId = message;
  numCurrentTime = currentTime;
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText = "\n      position: fixed; top: 16px; right: 16px;\n      background: var(--notif-bg, #282828); color: var(--notif-text, #e0e0e0);\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--notif-border, var(--acc, #888));\n      transform: translateX(20px);\n    ";
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);
  requestAnimationFrame(() => {
    notificationDiv.style.opacity = "1";
    notificationDiv.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    notificationDiv.style.transform = "translateX(20px)";
    setTimeout(() => notificationDiv.remove(), 200);
  }, 2500);
}
let isProcessed = false;
function initAdBlocker() {
  if (isProcessed) {
    return;
  }
  isProcessed = true;
  const Selectors = ["div.ad-block", "a[href*=\"ad\"]", "iframe[src*=\"ads\"], iframe[src*=\"googlead\"]", ".advertisement", "[class*=\"ads\"], [class*=\"ad-\"]", "[id*=\"ad\"], [id*=\"banner\"]", ".sidebar.left > a", ".sidebar.left > div:not(.sidebar-content)", "div.sidebar.left > div:has(> iframe)", "div.sidebar.left > div:has(> a[href*=\"doubleclick\"])"];
  const hideElementsAndAdjustSidebar = () => {
    Selectors.forEach(v28cbY => {
      document.querySelectorAll(v28cbY).forEach(targetElement => {
        targetElement.style.display = "none";
        targetElement.style.opacity = "0";
        targetElement.style.pointerEvents = "none";
        targetElement.style.visibility = "hidden";
        targetElement.removeAttribute("src");
        targetElement.remove();
      });
    });
    const leftSidebar = document.querySelector("div.sidebar.left");
    if (leftSidebar) {
      leftSidebar.style.maxWidth = "30vw";
      leftSidebar.style.width = "21rem";
      leftSidebar.style.overflow = "hidden";
    }
  };
  hideElementsAndAdjustSidebar();
  new MutationObserver(hideElementsAndAdjustSidebar).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
  setInterval(hideElementsAndAdjustSidebar, 5000);
  showNotification("Ad blocker active");
}
let entityTrailInterval = null;
let isToggled = false;
function startScheduledTask(taskData, intervalSeconds) {
  if (entityTrailInterval) {
    clearInterval(entityTrailInterval);
  }
  isToggled = true;
  entityTrailInterval = setInterval(() => {
    typeAndSendMessage(taskData);
  }, intervalSeconds * 1000);
}
function stopInterval() {
  if (entityTrailInterval) {
    clearInterval(entityTrailInterval);
    entityTrailInterval = null;
  }
  isToggled = false;
}
function typeAndSendMessage(textToType) {
  const chatInput = document.querySelector(".chat-input input") || document.querySelector("input[placeholder*=\"chat\" i]") || document.querySelector("input[type=\"text\"]");
  if (!chatInput) {
    return;
  }
  chatInput.focus();
  chatInput.value = "";
  let currentIndex = 0;
  const typeTextRecursive = () => {
    if (currentIndex >= textToType.length) {
      const sendButton = document.querySelector(".chat-input button") || document.querySelector("button[aria-label*=\"send\" i]");
      if (sendButton) {
        sendButton.click();
      } else {
        chatInput.dispatchEvent(new Event("change", {
          bubbles: true
        }));
        chatInput.dispatchEvent(new Event("input", {
          bubbles: true
        }));
        setTimeout(() => {
          chatInput.value = "";
          chatInput.blur();
        }, 100);
      }
      return;
    }
    chatInput.value += textToType[currentIndex];
    chatInput.dispatchEvent(new InputEvent("input", {
      bubbles: true
    }));
    currentIndex++;
    setTimeout(typeTextRecursive, 25);
  };
  typeTextRecursive();
}
let boolIsProcessed = false;
function interceptTextEncoder() {
  if (boolIsProcessed) {
    return;
  }
  function unescapeString(inputString) {
    if (typeof inputString !== "string") {
      return inputString;
    }
    return inputString.replace(/\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g, (match, octalStr, hexStr1, hexStr2, hexStr3) => {
      switch (octalStr[0]) {
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
          return String.fromCharCode(Number.parseInt(octalStr, 8) || 0);
        default:
          if (hexStr1 != null) {
            return String.fromCharCode(Number.parseInt(hexStr1, 16) || 0);
          }
          if (hexStr2 != null) {
            return String.fromCharCode(Number.parseInt(hexStr2, 16) || 0);
          }
          if (hexStr3 != null) {
            const codePoint = Number.parseInt(hexStr3, 16) || 0;
            if (codePoint > 1114111) {
              return match;
            } else {
              return String.fromCodePoint(codePoint);
            }
          }
          return octalStr;
      }
    });
  }
  const actionCodes = {
    spawn: 22,
    createTribe: 5,
    chat: 100
  };
  const originalEncode = TextEncoder.prototype.encode;
  TextEncoder.prototype.encode = function (...inputArgs) {
    try {
      const commandPatterns = [/^(\x14{3}\d+\|6\|)(.+)$/gm, /^(\x14{3}\d+\|8\|)(.+)$/gm, /^(\x14{3}\d+\|14\|)(.+)$/gm, /^(\x13{3}[01])(.+)$/gm];
      for (let patternIndex = 0; patternIndex < commandPatterns.length; patternIndex++) {
        const matchResult = commandPatterns[patternIndex].exec(inputArgs[0]);
        if (matchResult && matchResult.length === 3) {
          const actionHandler = [actionCodes.spawn, actionCodes.spawn, actionCodes.createTribe, actionCodes.chat][patternIndex];
          inputArgs[0] = matchResult[1] + unescapeString(matchResult[2]).substr(0, actionHandler);
          break;
        }
      }
    } catch {}
    return Reflect.apply(originalEncode, this, inputArgs);
  };
  const observer = new MutationObserver(() => {
    document.querySelector(".play-game .el-input__inner")?.setAttribute("maxlength", "80");
    document.querySelector(".new-tribe .el-input__inner")?.setAttribute("maxlength", "20");
    document.querySelector(".chat-input input")?.setAttribute("maxLength", "1000");
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  boolIsProcessed = true;
  showNotification("Special characters enabled");
}
let sysEntityTrailInterval = null;
let angleIndex = 0;
const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const radius = 300;
function getGameCanvas() {
  return document.querySelector("#gameCanvas") || document.querySelector("canvas") || document.querySelector("#canvas-container canvas");
}
function startCircularMovement() {
  if (sysEntityTrailInterval) {
    return;
  }
  const canvas = getGameCanvas();
  if (!canvas) {
    showNotification("Canvas not found");
    return;
  }
  sysEntityTrailInterval = setInterval(() => {
    const angleDegrees = angles[angleIndex];
    const angleRadians = Math.PI * 2 * angleDegrees / 360;
    const v4114OffsetX = Math.round(radius * Math.sin(angleRadians));
    const v2cf7OffsetY = Math.round(radius * Math.cos(angleRadians));
    canvas.dispatchEvent(new MouseEvent("pointermove", {
      clientX: window.innerWidth / 2 + v4114OffsetX,
      clientY: window.innerHeight / 2 + v2cf7OffsetY,
      bubbles: true
    }));
    angleIndex = (angleIndex + 1) % angles.length;
  }, 15);
}
function stopEntityTrail() {
  if (sysEntityTrailInterval) {
    clearInterval(sysEntityTrailInterval);
    sysEntityTrailInterval = null;
  }
}
function toggleMouseSimulation() {
  if (sysEntityTrailInterval) {
    stopEntityTrail();
  } else {
    startCircularMovement();
  }
}
let keyQ = "q";
let keyE = "e";
const offsetValue = 400;
function moveMouseSide(side) {
  const v5687Canvas = getGameCanvas();
  if (!v5687Canvas) {
    return;
  }
  const rect = v5687Canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetX = side === "left" ? centerX - offsetValue : centerX + offsetValue;
  v5687Canvas.dispatchEvent(new MouseEvent("pointermove", {
    clientX: targetX,
    clientY: centerY,
    bubbles: true,
    view: window
  }));
}
let gameInstance;
let State;
let playerData;
let globalIsProcessed = false;
let boolIsToggled = false;
const getAllPropertyNames = v1353TargetObject => {
  return [...Object.getOwnPropertyNames(Object.getPrototypeOf(v1353TargetObject)), ...Object.getOwnPropertyNames(v1353TargetObject)];
};
const config = {};
function isPlayer(entity) {
  if (!entity) {
    return false;
  }
  if (entity.visibleFishLevel != null && entity.visibleFishLevel > 0) {
    return true;
  }
  if (entity.fishLevel != null && entity.fishLevel > 0) {
    return true;
  }
  if (entity.level != null && entity.level > 0) {
    return true;
  }
  if (entity.score != null && entity.score > 0) {
    return true;
  }
  if (entity.xp != null && entity.xp > 0) {
    return true;
  }
  if (entity.playerRoomId != null) {
    return true;
  }
  if (entity.name != null && entity.name.length > 0) {
    return true;
  }
  if (entity.boosts != null || entity.boostCount != null) {
    return true;
  }
  if (entity.health != null && entity.health > 0) {
    return true;
  }
  if (entity.maxHealth != null && entity.maxHealth > 0) {
    return true;
  }
  return false;
}
function getGameState() {
  try {
    if (playerData && playerData.myAnimals && playerData.myAnimals.length > 0) {
      return playerData;
    }
    const states = window.__ss?.states;
    if (!states) {
      return playerData || null;
    }
    for (let v3462I = 0; v3462I < states.length; v3462I++) {
      if (states[v3462I]?.gameScene?.myAnimals) {
        return states[v3462I].gameScene;
      }
      if (states[v3462I]?.gameManager) {
        for (const managerKey of Object.keys(states[v3462I].gameManager)) {
          if (states[v3462I].gameManager[managerKey]?.myAnimals) {
            return states[v3462I].gameManager[managerKey];
          }
        }
      }
    }
    return playerData || null;
  } catch (error) {
    return playerData || null;
  }
}
function getEntityManager(gameState) {
  if (!gameState) {
    gameState = getGameState();
  }
  if (!gameState) {
    return null;
  }
  if (window.__cachedEM) {
    return window.__cachedEM;
  }
  if (config.entityManager) {
    const entityManager = gameState[config.entityManager];
    if (entityManager) {
      window.__cachedEM = entityManager;
      return entityManager;
    }
  }
  for (const key of Object.keys(gameState)) {
    const potentialManager = gameState[key];
    if (potentialManager && typeof potentialManager === "object" && !Array.isArray(potentialManager) && (potentialManager.entitiesList || potentialManager.entitiesById)) {
      window.__cachedEM = potentialManager;
      return potentialManager;
    }
  }
  return null;
}
function getFirstAnimal() {
  try {
    const userData = getGameState();
    if (!userData) {
      return null;
    }
    if (userData.myAnimals && userData.myAnimals.length > 0) {
      return userData.myAnimals[0];
    }
    if (userData.myPiranhas && userData.myPiranhas.length > 0) {
      return userData.myPiranhas[0];
    }
    return null;
  } catch (v3b2aError) {
    return null;
  }
}
function getFirstAnimalPosition() {
  try {
    const animal = getFirstAnimal();
    if (!animal) {
      return null;
    }
    const position = animal.position;
    return {
      x: position._x !== undefined ? position._x : position.x,
      y: position._y !== undefined ? position._y : position.y
    };
  } catch (v1527Error) {
    return null;
  }
}
function getEntityPosition(v5511Entity) {
  if (!v5511Entity || !v5511Entity.position) {
    return null;
  }
  return {
    x: v5511Entity.position._x !== undefined ? v5511Entity.position._x : v5511Entity.position.x,
    y: v5511Entity.position._y !== undefined ? v5511Entity.position._y : v5511Entity.position.y
  };
}
function calculateDirection(v2c98Entity) {
  if (!v2c98Entity) {
    return {
      dirX: 1,
      dirY: 0
    };
  }
  let dirX = 0;
  let dirY = 0;
  if (v2c98Entity.velocity) {
    dirX = v2c98Entity.velocity._x || v2c98Entity.velocity.x || 0;
    dirY = v2c98Entity.velocity._y || v2c98Entity.velocity.y || 0;
  }
  if (Math.abs(dirX) < 0.01 && Math.abs(dirY) < 0.01) {
    const angle = v2c98Entity.rotation || v2c98Entity.angle || v2c98Entity._rotation || 0;
    dirX = Math.cos(angle);
    dirY = Math.sin(angle);
  }
  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
  if (magnitude > 0.001) {
    dirX /= magnitude;
    dirY /= magnitude;
  } else {
    dirX = 1;
    dirY = 0;
  }
  return {
    dirX: dirX,
    dirY: dirY
  };
}
function findEntityById(entityId) {
  try {
    const rawState = getGameState();
    if (!rawState) {
      return null;
    }
    const v3e73GameState = getEntityManager(rawState);
    if (!v3e73GameState) {
      return null;
    }
    let foundEntity = v3e73GameState.entitiesById ? v3e73GameState.entitiesById[entityId] : null;
    if (!foundEntity && v3e73GameState.entitiesList) {
      foundEntity = v3e73GameState.entitiesList.find(item => item.id === entityId);
    }
    if (!foundEntity && v3e73GameState.animalsByPlayerRoomId) {
      for (let roomId of Object.keys(v3e73GameState.animalsByPlayerRoomId)) {
        const roomEntities = v3e73GameState.animalsByPlayerRoomId[roomId];
        if (Array.isArray(roomEntities)) {
          foundEntity = roomEntities.find(selectedItem => selectedItem && selectedItem.id === entityId);
        } else if (roomEntities && roomEntities.id === entityId) {
          foundEntity = roomEntities;
        }
        if (foundEntity) {
          break;
        }
      }
    }
    return foundEntity;
  } catch (v2eaaError) {
    return null;
  }
}
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function getNearbyEntities() {
  try {
    const v169cRawState = getGameState();
    const v56d6GameState = getEntityManager(v169cRawState);
    const myPlayer = getFirstAnimal();
    const myPosition = getFirstAnimalPosition();
    if (!v56d6GameState || !myPlayer || !myPosition) {
      return null;
    }
    const entityData = {
      myId: myPlayer.id,
      myPos: myPosition,
      entities: [],
      players: [],
      food: []
    };
    const entitiesList = v56d6GameState.entitiesList || [];
    for (let v11d5I = 0; v11d5I < entitiesList.length; v11d5I++) {
      const v2414Entity = entitiesList[v11d5I];
      if (!v2414Entity || v2414Entity.id === myPlayer.id) {
        continue;
      }
      if (myPlayer.playerRoomId && v2414Entity.playerRoomId === myPlayer.playerRoomId) {
        continue;
      }
      const pos = getEntityPosition(v2414Entity);
      if (!pos || pos.x == null || pos.y == null) {
        continue;
      }
      const dx = pos.x - myPosition.x;
      const dy = pos.y - myPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const entityInfo = {
        id: v2414Entity.id,
        x: pos.x,
        y: pos.y,
        distance: distance,
        angle: Math.atan2(dy, dx),
        entity: v2414Entity
      };
      entityData.entities.push(entityInfo);
      if (isPlayer(v2414Entity)) {
        entityData.players.push(entityInfo);
      } else {
        entityData.food.push(entityInfo);
      }
    }
    entityData.players.sort((itemA, itemB) => itemA.distance - itemB.distance);
    entityData.food.sort((itemC, itemD) => itemC.distance - itemD.distance);
    return entityData;
  } catch (v2f85Error) {
    return {
      error: v2f85Error.message
    };
  }
}
function getZoomScale() {
  try {
    if (gameInstance?.viewport?.scale?.x && gameInstance.viewport.scale.x > 0) {
      return gameInstance.viewport.scale.x;
    }
    const camera = getGameState();
    if (camera?.camera?.zoom && camera.camera.zoom > 0) {
      return camera.camera.zoom;
    }
    if (camera?.camera?.currentZoomLevel && camera.camera.currentZoomLevel > 0) {
      return camera.camera.currentZoomLevel;
    }
    if (gameInstance?.viewport) {
      const viewport = gameInstance.viewport;
      if (viewport.worldWidth && viewport.screenWidth && viewport.worldWidth > 0) {
        return viewport.screenWidth / viewport.worldWidth;
      }
      if (viewport.scaled) {
        return viewport.scaled;
      }
    }
  } catch (v1daeError) {}
  return 0.15;
}
let isProcessed = false;
function updateLockOnTarget() {
  if (!isProcessed) {
    return;
  }
  requestAnimationFrame(updateLockOnTarget);
  if (!window.lockEnabled || !window.lockTargetId) {
    return;
  }
  try {
    const targetEntity = findEntityById(window.lockTargetId);
    if (!targetEntity) {
      showNotification("Lock target lost");
      window.lockTargetId = null;
      window.lockEnabled = false;
      updateLockButtonUI();
      return;
    }
    const targetPos = getEntityPosition(targetEntity);
    const playerPos = getFirstAnimalPosition();
    if (!targetPos || !playerPos) {
      return;
    }
    const v802cCanvas = getGameCanvas();
    if (!v802cCanvas) {
      return;
    }
    const canvasRect = v802cCanvas.getBoundingClientRect();
    const v4f33CenterX = canvasRect.left + canvasRect.width / 2;
    const v55cbCenterY = canvasRect.top + canvasRect.height / 2;
    const diffX = targetPos.x - playerPos.x;
    const diffY = targetPos.y - playerPos.y;
    const f99aDistance = Math.sqrt(diffX * diffX + diffY * diffY);
    let predictedX = targetPos.x;
    let predictedY = targetPos.y;
    if (targetEntity.velocity) {
      const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
      const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
      const predictionFactor = Math.min(f99aDistance / 800, 0.5);
      predictedX += velX * predictionFactor;
      predictedY += velY * predictionFactor;
    }
    const finalDiffX = predictedX - playerPos.x;
    const finalDiffY = predictedY - playerPos.y;
    const finalDistance = Math.sqrt(finalDiffX * finalDiffX + finalDiffY * finalDiffY);
    let smoothingFactor = 1.5;
    if (finalDistance > 2000) {
      smoothingFactor = 3;
    } else if (finalDistance > 1000) {
      smoothingFactor = 2;
    } else if (finalDistance < 200) {
      smoothingFactor = 0.8;
    }
    const maxOffset = Math.min(canvasRect.width, canvasRect.height) * 0.85;
    let offsetX = finalDiffX * smoothingFactor;
    let offsetY = finalDiffY * smoothingFactor;
    const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (offsetMagnitude > maxOffset) {
      const v45b8Angle = maxOffset / offsetMagnitude;
      offsetX *= v45b8Angle;
      offsetY *= v45b8Angle;
    }
    v802cCanvas.dispatchEvent(new MouseEvent("pointermove", {
      clientX: v4f33CenterX + offsetX,
      clientY: v55cbCenterY + offsetY,
      bubbles: true,
      view: window
    }));
  } catch (data) {}
}
function toggleLock() {
  if (window.lockEnabled && window.lockTargetId) {
    window.lockEnabled = false;
    window.lockTargetId = null;
    showNotification("Lock released");
  } else {
    const v57e6GameState = getNearbyEntities();
    if (v57e6GameState && v57e6GameState.players && v57e6GameState.players.length > 0) {
      window.lockEnabled = true;
      window.lockTargetId = v57e6GameState.players[0].id;
      const targetName = v57e6GameState.players[0].entity?.name || "ID:" + window.lockTargetId;
      showNotification("Locked: " + targetName);
    } else {
      showNotification("No players to lock on");
    }
  }
  updateLockButtonUI();
}
function updateLockButtonUI() {
  const lockButton = document.getElementById("lockBtn");
  if (lockButton) {
    lockButton.textContent = window.lockEnabled && window.lockTargetId ? "Unlock" : "Lock Nearest";
    lockButton.classList.toggle("toggle-on", !!window.lockEnabled && !!window.lockTargetId);
  }
}
let mainEntityTrailInterval = null;
function startEntityTrail() {
  if (mainEntityTrailInterval) {
    clearInterval(mainEntityTrailInterval);
    mainEntityTrailInterval = null;
  }
  mainEntityTrailInterval = setInterval(() => {
    if (!window.entityTrailEnabled || !window.entityTrailTargetId) {
      return;
    }
    const targetEntityId = findEntityById(window.entityTrailTargetId);
    if (!targetEntityId) {
      const v25a6GameData = getNearbyEntities();
      if (v25a6GameData && v25a6GameData.players && v25a6GameData.players.length > 0) {
        window.entityTrailTargetId = v25a6GameData.players[0].id;
      }
      return;
    }
    const v44fcTargetEntity = getEntityPosition(targetEntityId);
    if (!v44fcTargetEntity) {
      return;
    }
    const v3397LastTrailPoint = window.entityTrailHistory[window.entityTrailHistory.length - 1];
    if (v3397LastTrailPoint && calculateDistance(v3397LastTrailPoint.x, v3397LastTrailPoint.y, v44fcTargetEntity.x, v44fcTargetEntity.y) < 5) {
      return;
    }
    window.entityTrailHistory.push({
      x: v44fcTargetEntity.x,
      y: v44fcTargetEntity.y,
      time: Date.now()
    });
    if (window.entityTrailHistory.length > window.entityTrailMaxLength) {
      window.entityTrailHistory.shift();
    }
  }, window.entityTrailRecordInterval);
}
function mainStopEntityTrail() {
  if (mainEntityTrailInterval) {
    clearInterval(mainEntityTrailInterval);
    mainEntityTrailInterval = null;
  }
}
function toggleEntityTrail() {
  if (window.entityTrailEnabled) {
    window.entityTrailEnabled = false;
    window.entityTrailTargetId = null;
    mainStopEntityTrail();
    window.entityTrailHistory = [];
    showNotification("Trail stopped");
    refreshUI();
    return;
  }
  const nearbyPlayersData = getNearbyEntities();
  const hasNearbyPlayers = nearbyPlayersData && nearbyPlayersData.players && nearbyPlayersData.players.length > 0;
  if (!hasNearbyPlayers) {
    showNotification("No players nearby to trace");
    return;
  }
  const targetPlayerId = nearbyPlayersData.players[0].id;
  const targetPlayerName = nearbyPlayersData.players[0].entity?.name || "ID:" + targetPlayerId;
  window.entityTrailEnabled = true;
  window.entityTrailTargetId = targetPlayerId;
  window.entityTrailHistory = [];
  startEntityTrail();
  showNotification("Tracing: " + targetPlayerName);
  refreshUI();
}
function refreshUI() {}
function drawEntityTrail(ctx, v29cbCanvas, originPos, zoomScale) {
  if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) {
    return;
  }
  const halfWidth = v29cbCanvas.width / 2;
  const halfHeight = v29cbCanvas.height / 2;
  const v4863CurrentTime = Date.now();
  const trailDuration = 30000;
  const {
    r: red,
    g: green,
    b: blue
  } = window.entityTrailColor;
  for (let v2df1I = 1; v2df1I < window.entityTrailHistory.length; v2df1I++) {
    const prevPoint = window.entityTrailHistory[v2df1I - 1];
    const currPoint = window.entityTrailHistory[v2df1I];
    const age = v4863CurrentTime - currPoint.time;
    const opacity = Math.max(0.05, 1 - age / trailDuration);
    const startX = halfWidth + (prevPoint.x - originPos.x) * zoomScale;
    const startY = halfHeight + (prevPoint.y - originPos.y) * zoomScale;
    const endX = halfWidth + (currPoint.x - originPos.x) * zoomScale;
    const endY = halfHeight + (currPoint.y - originPos.y) * zoomScale;
    const progress = v2df1I / window.entityTrailHistory.length;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "rgba(" + red + "," + green + "," + blue + "," + opacity + ")";
    ctx.lineWidth = 1.5 + progress * 1.5;
    ctx.stroke();
  }
  for (let j = 0; j < window.entityTrailHistory.length; j += 5) {
    const point = window.entityTrailHistory[j];
    const pointAge = v4863CurrentTime - point.time;
    const pointOpacity = Math.max(0.1, 1 - pointAge / trailDuration);
    const pointX = halfWidth + (point.x - originPos.x) * zoomScale;
    const pointY = halfHeight + (point.y - originPos.y) * zoomScale;
    ctx.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + pointOpacity + ")";
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (window.entityTrailHistory.length > 0) {
    const lastTrailPoint = window.entityTrailHistory[window.entityTrailHistory.length - 1];
    const v32d6ScreenY = halfWidth + (lastTrailPoint.x - originPos.x) * zoomScale;
    const d2d3ScreenY = halfHeight + (lastTrailPoint.y - originPos.y) * zoomScale;
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    ctx.font = "bold 10px monospace";
    ctx.fillText("TRAIL (" + window.entityTrailHistory.length + " pts)", v32d6ScreenY + 8, d2d3ScreenY - 8);
  }
}
function getOrCreateOverlayCanvas(canvasId, zIndex) {
  let overlayCanvas = document.getElementById(canvasId);
  if (!overlayCanvas) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = canvasId;
    overlayCanvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:" + zIndex + ";";
    document.body.appendChild(overlayCanvas);
  }
  const gameCanvas = getGameCanvas();
  if (gameCanvas) {
    const gameCanvasRect = gameCanvas.getBoundingClientRect();
    if (overlayCanvas.width !== gameCanvasRect.width || overlayCanvas.height !== gameCanvasRect.height) {
      overlayCanvas.width = gameCanvasRect.width;
      overlayCanvas.height = gameCanvasRect.height;
    }
    overlayCanvas.style.left = gameCanvasRect.left + "px";
    overlayCanvas.style.top = gameCanvasRect.top + "px";
    overlayCanvas.style.width = gameCanvasRect.width + "px";
    overlayCanvas.style.height = gameCanvasRect.height + "px";
  } else if (overlayCanvas.width !== window.innerWidth || overlayCanvas.height !== window.innerHeight) {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
  }
  return overlayCanvas;
}
function renderOverlay() {
  const v3843OverlayCanvas = getOrCreateOverlayCanvas("ast-overlay", 999997);
  const overlayCtx = v3843OverlayCanvas.getContext("2d");
  overlayCtx.clearRect(0, 0, v3843OverlayCanvas.width, v3843OverlayCanvas.height);
  const v152dEntityData = getFirstAnimalPosition();
  if (v152dEntityData && window.entityTrailEnabled) {
    drawEntityTrail(overlayCtx, v3843OverlayCanvas, v152dEntityData, getZoomScale());
  }
  requestAnimationFrame(renderOverlay);
}
function drawEsp(v5568Ctx, v136aGameState, v4893OffsetX, v5815OffsetY, scale) {
  if (!v136aGameState || v136aGameState.error) {
    return;
  }
  const myPos = v136aGameState.myPos;
  const espMode = window.espMode;
  const trackedId = window.espTrackedEntityId;
  let entities = espMode === "players" ? v136aGameState.players || [] : v136aGameState.food || [];
  let viewportOffsetX = 0;
  let viewportOffsetY = 0;
  try {
    if (gameInstance?.viewport) {
      const v2067Viewport = gameInstance.viewport;
      if (v2067Viewport.center && v2067Viewport.center.x != null) {
        viewportOffsetX = (v2067Viewport.center.x - myPos.x) * scale;
        viewportOffsetY = (v2067Viewport.center.y - myPos.y) * scale;
      }
    }
  } catch (err) {}
  entities.forEach(v2f06Entity => {
    const v431cDeltaX = v2f06Entity.x - myPos.x;
    const v1e95DeltaY = v2f06Entity.y - myPos.y;
    const v2dd0ScreenX = v4893OffsetX + v431cDeltaX * scale - viewportOffsetX;
    const v3ff3ScreenY = v5815OffsetY + v1e95DeltaY * scale - viewportOffsetY;
    const isTracked = trackedId && v2f06Entity.id === trackedId;
    const boxSize = 20;
    let v344aEspColor;
    if (espMode === "players") {
      v344aEspColor = isTracked ? window.espColors.tracked : v2f06Entity.distance < 500 ? window.espColors.close : v2f06Entity.distance < 1500 ? window.espColors.medium : v2f06Entity.distance < 3000 ? window.espColors.far : window.espColors.veryFar;
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.lineWidth = isTracked ? 3 : 2;
      v5568Ctx.strokeRect(v2dd0ScreenX - boxSize / 2, v3ff3ScreenY - boxSize / 2, boxSize, boxSize);
      v5568Ctx.fillStyle = v344aEspColor;
      v5568Ctx.font = "bold 11px monospace";
      v5568Ctx.fillText(v2f06Entity.entity?.name || "ID:" + v2f06Entity.id, v2dd0ScreenX - boxSize / 2, v3ff3ScreenY - boxSize / 2 - 8);
      v5568Ctx.font = "10px monospace";
      v5568Ctx.fillText(Math.round(v2f06Entity.distance).toString(), v2dd0ScreenX - boxSize / 2, v3ff3ScreenY + boxSize / 2 + 13);
      if (v2f06Entity.entity?.visibleFishLevel != null) {
        v5568Ctx.fillText("Lvl:" + v2f06Entity.entity.visibleFishLevel, v2dd0ScreenX - boxSize / 2, v3ff3ScreenY + boxSize / 2 + 24);
      }
      if (window.lockEnabled && window.lockTargetId === v2f06Entity.id) {
        v5568Ctx.strokeStyle = "#ff0000";
        v5568Ctx.lineWidth = 2;
        const offset = 15;
        v5568Ctx.beginPath();
        v5568Ctx.moveTo(v2dd0ScreenX - offset, v3ff3ScreenY);
        v5568Ctx.lineTo(v2dd0ScreenX + offset, v3ff3ScreenY);
        v5568Ctx.moveTo(v2dd0ScreenX, v3ff3ScreenY - offset);
        v5568Ctx.lineTo(v2dd0ScreenX, v3ff3ScreenY + offset);
        v5568Ctx.stroke();
        v5568Ctx.beginPath();
        v5568Ctx.arc(v2dd0ScreenX, v3ff3ScreenY, offset, 0, Math.PI * 2);
        v5568Ctx.strokeStyle = "rgba(255,0,0,0.7)";
        v5568Ctx.stroke();
        v5568Ctx.fillStyle = "#ff0000";
        v5568Ctx.font = "bold 10px monospace";
        v5568Ctx.fillText("LOCKED", v2dd0ScreenX + offset + 4, v3ff3ScreenY - 4);
      }
      v5568Ctx.beginPath();
      v5568Ctx.moveTo(v4893OffsetX, v5815OffsetY);
      v5568Ctx.lineTo(v2dd0ScreenX, v3ff3ScreenY);
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.globalAlpha = 0.25;
      v5568Ctx.lineWidth = 1;
      v5568Ctx.stroke();
      v5568Ctx.globalAlpha = 1;
    } else {
      v344aEspColor = v2f06Entity.distance < 300 ? window.espColors.foodClose : v2f06Entity.distance < 1000 ? window.espColors.foodMedium : window.espColors.foodFar;
      v5568Ctx.strokeStyle = v344aEspColor;
      v5568Ctx.lineWidth = 1.5;
      v5568Ctx.strokeRect(v2dd0ScreenX - boxSize / 2, v3ff3ScreenY - boxSize / 2, boxSize, boxSize);
      if (v2f06Entity.distance < 1000) {
        v5568Ctx.fillStyle = v344aEspColor;
        v5568Ctx.font = "9px monospace";
        v5568Ctx.fillText(Math.round(v2f06Entity.distance).toString(), v2dd0ScreenX + boxSize / 2 + 3, v3ff3ScreenY + 3);
      }
    }
  });
}
function drawTrackedEntity(v3ef8Ctx, v704bCanvas, v22dcMyPos, v2af4Scale) {
  if (!window.espTrackedEntityId) {
    return;
  }
  const trackedEntity = findEntityById(window.espTrackedEntityId);
  if (!trackedEntity) {
    return;
  }
  if (!isPlayer(trackedEntity)) {
    window.espTrackedEntityId = null;
    return;
  }
  const entityPos = getEntityPosition(trackedEntity);
  if (!entityPos || !v22dcMyPos) {
    return;
  }
  const v552bCenterX = v704bCanvas.width / 2;
  const v171aCenterY = v704bCanvas.height / 2;
  const deltaX = entityPos.x - v22dcMyPos.x;
  const deltaY = entityPos.y - v22dcMyPos.y;
  const screenX = v552bCenterX + deltaX * v2af4Scale;
  const screenY = v171aCenterY + deltaY * v2af4Scale;
  const v400eDistance = calculateDistance(v22dcMyPos.x, v22dcMyPos.y, entityPos.x, entityPos.y);
  const entityDir = calculateDirection(trackedEntity);
  const pulseOpacity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const markerSize = 40;
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(v552bCenterX, v171aCenterY);
  v3ef8Ctx.lineTo(screenX, screenY);
  v3ef8Ctx.strokeStyle = "rgba(255,0,255,0.6)";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.setLineDash([8, 4]);
  v3ef8Ctx.stroke();
  v3ef8Ctx.setLineDash([]);
  v3ef8Ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v3ef8Ctx.lineWidth = 3;
  v3ef8Ctx.strokeRect(screenX - markerSize / 2, screenY - markerSize / 2, markerSize, markerSize);
  const arrowLength = 50;
  const f734Angle = Math.atan2(entityDir.dirY, entityDir.dirX);
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(screenX, screenY);
  v3ef8Ctx.lineTo(screenX + entityDir.dirX * arrowLength, screenY + entityDir.dirY * arrowLength);
  v3ef8Ctx.strokeStyle = "#ff00ff";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.stroke();
  v3ef8Ctx.beginPath();
  v3ef8Ctx.moveTo(screenX + entityDir.dirX * arrowLength, screenY + entityDir.dirY * arrowLength);
  v3ef8Ctx.lineTo(screenX + entityDir.dirX * arrowLength - Math.cos(f734Angle - 0.4) * 10, screenY + entityDir.dirY * arrowLength - Math.sin(f734Angle - 0.4) * 10);
  v3ef8Ctx.moveTo(screenX + entityDir.dirX * arrowLength, screenY + entityDir.dirY * arrowLength);
  v3ef8Ctx.lineTo(screenX + entityDir.dirX * arrowLength - Math.cos(f734Angle + 0.4) * 10, screenY + entityDir.dirY * arrowLength - Math.sin(f734Angle + 0.4) * 10);
  v3ef8Ctx.strokeStyle = "#ff00ff";
  v3ef8Ctx.lineWidth = 2;
  v3ef8Ctx.stroke();
  const rectWidth = 180;
  const rectHeight = 70;
  const boxX = Math.min(screenX + markerSize / 2 + 10, v704bCanvas.width - rectWidth - 5);
  const boxY = Math.max(5, Math.min(screenY - rectHeight / 2, v704bCanvas.height - rectHeight - 5));
  v3ef8Ctx.fillStyle = "rgba(0,0,0,0.85)";
  v3ef8Ctx.strokeStyle = "rgba(255,0,255," + pulseOpacity + ")";
  v3ef8Ctx.lineWidth = 1.5;
  v3ef8Ctx.beginPath();
  v3ef8Ctx.roundRect(boxX, boxY, rectWidth, rectHeight, 4);
  v3ef8Ctx.fill();
  v3ef8Ctx.stroke();
  v3ef8Ctx.fillStyle = "#ff00ff";
  v3ef8Ctx.font = "bold 12px monospace";
  v3ef8Ctx.fillText("TRACKING", boxX + 8, boxY + 18);
  v3ef8Ctx.fillStyle = "#ffffff";
  v3ef8Ctx.font = "11px monospace";
  v3ef8Ctx.fillText((trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(0, 18), boxX + 8, boxY + 34);
  v3ef8Ctx.fillStyle = "#ff00ff";
  v3ef8Ctx.font = "bold 14px monospace";
  v3ef8Ctx.fillText(Math.round(v400eDistance) + " units", boxX + 8, boxY + 52);
  if (screenX < 0 || screenX > v704bCanvas.width || screenY < 0 || screenY > v704bCanvas.height) {
    const targetAngle = Math.atan2(screenY - v171aCenterY, screenX - v552bCenterX);
    const posX = v552bCenterX + Math.cos(targetAngle) * (v704bCanvas.width / 2 - 40);
    const posY = v171aCenterY + Math.sin(targetAngle) * (v704bCanvas.height / 2 - 40);
    v3ef8Ctx.fillStyle = "rgba(0,0,0,0.85)";
    v3ef8Ctx.beginPath();
    v3ef8Ctx.roundRect(posX - 40, posY - 15, 80, 30, 4);
    v3ef8Ctx.fill();
    v3ef8Ctx.strokeStyle = "#ff00ff";
    v3ef8Ctx.lineWidth = 1.5;
    v3ef8Ctx.stroke();
    v3ef8Ctx.beginPath();
    v3ef8Ctx.moveTo(posX + Math.cos(targetAngle) * 20, posY + Math.sin(targetAngle) * 20);
    v3ef8Ctx.lineTo(posX - Math.cos(targetAngle - 0.5) * 10, posY - Math.sin(targetAngle - 0.5) * 10);
    v3ef8Ctx.lineTo(posX - Math.cos(targetAngle + 0.5) * 10, posY - Math.sin(targetAngle + 0.5) * 10);
    v3ef8Ctx.closePath();
    v3ef8Ctx.fillStyle = "#ff00ff";
    v3ef8Ctx.fill();
    v3ef8Ctx.fillStyle = "#ffffff";
    v3ef8Ctx.font = "bold 11px monospace";
    v3ef8Ctx.textAlign = "center";
    v3ef8Ctx.fillText(Math.round(v400eDistance).toString(), posX, posY + 4);
    v3ef8Ctx.textAlign = "left";
  }
}
let dragState = {
  dragging: false,
  offsetX: 0,
  offsetY: 0,
  x: null,
  y: 20
};
function drawRadar(v2156Ctx, v14bbCanvas, v631aGameState) {
  if (!v631aGameState || v631aGameState.error) {
    return;
  }
  const radarSize = 150;
  if (dragState.x === null) {
    dragState.x = v14bbCanvas.width - radarSize - 20;
  }
  const radarX = dragState.x;
  const radarY = dragState.y;
  const worldSize = 5000;
  const radarScale = radarSize / (worldSize * 2);
  window._radarBounds = {
    x: radarX,
    y: radarY,
    w: radarSize,
    h: radarSize + 22
  };
  v2156Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v2156Ctx.beginPath();
  v2156Ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
  v2156Ctx.fill();
  v2156Ctx.strokeStyle = "#333";
  v2156Ctx.lineWidth = 1;
  v2156Ctx.stroke();
  v2156Ctx.strokeStyle = "rgba(60,60,60,0.5)";
  v2156Ctx.lineWidth = 0.5;
  v2156Ctx.beginPath();
  v2156Ctx.moveTo(radarX + radarSize / 2, radarY);
  v2156Ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
  v2156Ctx.moveTo(radarX, radarY + radarSize / 2);
  v2156Ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
  v2156Ctx.stroke();
  for (let circleRadiusFactor = 0.25; circleRadiusFactor <= 1; circleRadiusFactor += 0.25) {
    v2156Ctx.beginPath();
    v2156Ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, radarSize / 2 * circleRadiusFactor, 0, Math.PI * 2);
    v2156Ctx.strokeStyle = "rgba(60,60,60," + (0.2 + circleRadiusFactor * 0.1) + ")";
    v2156Ctx.stroke();
  }
  v2156Ctx.fillStyle = "#1db954";
  v2156Ctx.beginPath();
  v2156Ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, 4, 0, Math.PI * 2);
  v2156Ctx.fill();
  const radarEntities = window.espMode === "players" ? v631aGameState.players || [] : v631aGameState.food || [];
  radarEntities.forEach(target => {
    const v1e98DiffX = target.x - v631aGameState.myPos.x;
    const v484fDiffY = target.y - v631aGameState.myPos.y;
    let v1a70ScreenX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + v1e98DiffX * radarScale));
    let v5a19ScreenY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + v484fDiffY * radarScale));
    let v439cEspColor;
    let v483cRadius;
    if (window.espMode === "players") {
      v439cEspColor = target.distance < 500 ? window.espColors.close : target.distance < 1500 ? window.espColors.medium : target.distance < 3000 ? window.espColors.far : "#888";
      v483cRadius = 3;
    } else {
      v439cEspColor = window.espColors.foodClose;
      v483cRadius = 1.5;
    }
    if (window.espTrackedEntityId && target.id === window.espTrackedEntityId) {
      v439cEspColor = window.espColors.tracked;
      v483cRadius = 4;
    }
    if (window.lockTargetId && target.id === window.lockTargetId) {
      v439cEspColor = "#ff0000";
      v483cRadius = 4;
    }
    v2156Ctx.fillStyle = v439cEspColor;
    v2156Ctx.beginPath();
    v2156Ctx.arc(v1a70ScreenX, v5a19ScreenY, v483cRadius, 0, Math.PI * 2);
    v2156Ctx.fill();
  });
  if (window.entityTrailEnabled && window.entityTrailTargetId) {
    const targetId = findEntityById(window.entityTrailTargetId);
    if (targetId) {
      const v4855TargetEntity = getEntityPosition(targetId);
      if (v4855TargetEntity) {
        const v3e3cOffsetY = v4855TargetEntity.x - v631aGameState.myPos.x;
        const v4515OffsetY = v4855TargetEntity.y - v631aGameState.myPos.y;
        const drawY = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + v3e3cOffsetY * radarScale));
        const v2a2bDrawY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + v4515OffsetY * radarScale));
        const alpha = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const {
          r: v4b2eRed,
          g: v3abdBlue,
          b: v1283Blue
        } = window.entityTrailColor;
        const rgbValue = v4b2eRed + "," + v3abdBlue + "," + v1283Blue;
        v2156Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha + ")";
        v2156Ctx.lineWidth = 2;
        v2156Ctx.beginPath();
        v2156Ctx.arc(drawY, v2a2bDrawY, 7, 0, Math.PI * 2);
        v2156Ctx.stroke();
        v2156Ctx.strokeStyle = "rgba(" + rgbValue + "," + alpha * 0.5 + ")";
        v2156Ctx.lineWidth = 4;
        v2156Ctx.beginPath();
        v2156Ctx.arc(drawY, v2a2bDrawY, 10, 0, Math.PI * 2);
        v2156Ctx.stroke();
        v2156Ctx.fillStyle = "rgb(" + rgbValue + ")";
        v2156Ctx.beginPath();
        v2156Ctx.arc(drawY, v2a2bDrawY, 3, 0, Math.PI * 2);
        v2156Ctx.fill();
        if (window.entityTrailHistory.length > 1) {
          v2156Ctx.strokeStyle = "rgba(" + rgbValue + ",0.3)";
          v2156Ctx.lineWidth = 1;
          v2156Ctx.beginPath();
          window.entityTrailHistory.forEach((v3ea3Entity, v1d1bI) => {
            const drawX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + (v3ea3Entity.x - v631aGameState.myPos.x) * radarScale));
            const v5d4fDrawY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + (v3ea3Entity.y - v631aGameState.myPos.y) * radarScale));
            if (v1d1bI === 0) {
              v2156Ctx.moveTo(drawX, v5d4fDrawY);
            } else {
              v2156Ctx.lineTo(drawX, v5d4fDrawY);
            }
          });
          v2156Ctx.stroke();
        }
      }
    }
  }
  v2156Ctx.fillStyle = "rgba(20,20,20,0.9)";
  v2156Ctx.beginPath();
  v2156Ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [0, 0, 4, 4]);
  v2156Ctx.fill();
  v2156Ctx.fillStyle = "#888";
  v2156Ctx.font = "10px monospace";
  v2156Ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
  v2156Ctx.fillText((window.espMode === "players" ? "P:" : "F:") + radarEntities.length, radarX + radarSize - 50, radarY + radarSize + 14);
}
function initRadarDrag() {
  if (window._radarDragInit) {
    return;
  }
  window._radarDragInit = true;
  document.addEventListener("mousedown", renderRadar => {
    const radarBounds = window._radarBounds;
    if (!radarBounds || !window.espEnabled) {
      return;
    }
    if (renderRadar.clientX >= radarBounds.x && renderRadar.clientX <= radarBounds.x + radarBounds.w && renderRadar.clientY >= radarBounds.y && renderRadar.clientY <= radarBounds.y + radarBounds.h) {
      dragState.dragging = true;
      dragState.offsetX = renderRadar.clientX - radarBounds.x;
      dragState.offsetY = renderRadar.clientY - radarBounds.y;
      renderRadar.preventDefault();
      renderRadar.stopPropagation();
    }
  }, true);
  document.addEventListener("mousemove", mouseMoveEvent => {
    if (!dragState.dragging) {
      return;
    }
    dragState.x = mouseMoveEvent.clientX - dragState.offsetX;
    dragState.y = mouseMoveEvent.clientY - dragState.offsetY;
    mouseMoveEvent.preventDefault();
  }, true);
  document.addEventListener("mouseup", mouseUpEvent => {
    if (dragState.dragging) {
      dragState.dragging = false;
      mouseUpEvent.preventDefault();
    }
  }, true);
}
function renderEspLoop() {
  if (!window.espEnabled) {
    const espOverlay = document.getElementById("esp-overlay");
    if (espOverlay) {
      espOverlay.getContext("2d").clearRect(0, 0, espOverlay.width, espOverlay.height);
    }
    requestAnimationFrame(renderEspLoop);
    return;
  }
  const espCanvas = getOrCreateOverlayCanvas("esp-overlay", 999998);
  const eba1Ctx = espCanvas.getContext("2d");
  eba1Ctx.clearRect(0, 0, espCanvas.width, espCanvas.height);
  const crosshairPos = getNearbyEntities();
  const v4929PlayerPos = getFirstAnimalPosition();
  const espColor = getZoomScale();
  drawEsp(eba1Ctx, crosshairPos, espCanvas.width / 2, espCanvas.height / 2, espColor);
  drawTrackedEntity(eba1Ctx, espCanvas, v4929PlayerPos, espColor);
  drawRadar(eba1Ctx, espCanvas, crosshairPos);
  requestAnimationFrame(renderEspLoop);
}
function toggleEsp() {
  window.espEnabled = !window.espEnabled;
  showNotification(window.espEnabled ? "ESP enabled" : "ESP disabled");
}
function trackPlayer() {
  const gameData = getNearbyEntities();
  if (gameData && gameData.players && gameData.players.length > 0) {
    window.espTrackedEntityId = gameData.players[0].id;
    showNotification("Tracking: " + (gameData.players[0].entity?.name || window.espTrackedEntityId));
  } else {
    showNotification("No players nearby");
  }
}
function modToggleEsp() {
  window.espTrackedEntityId = null;
  showNotification("Tracking cleared");
}
function simulateClick(clientX, clientY) {
  const v1940GameCanvas = getGameCanvas();
  if (!v1940GameCanvas) {
    return;
  }
  v1940GameCanvas.dispatchEvent(new PointerEvent("pointerdown", {
    clientX: clientX,
    clientY: clientY,
    button: 0,
    buttons: 1,
    bubbles: true,
    view: window
  }));
  setTimeout(() => {
    v1940GameCanvas.dispatchEvent(new PointerEvent("pointerup", {
      clientX: clientX,
      clientY: clientY,
      buttons: 0,
      bubbles: true,
      view: window
    }));
  }, 80);
}
function aimAtTarget(v6c26TargetX, targetY, shouldClick) {
  const v5a94GameCanvas = getGameCanvas();
  if (!v5a94GameCanvas) {
    return;
  }
  const v1c56PlayerPos = getFirstAnimalPosition();
  if (!v1c56PlayerPos) {
    return;
  }
  const v329fCanvasRect = v5a94GameCanvas.getBoundingClientRect();
  const canvasCenterX = v329fCanvasRect.left + v329fCanvasRect.width / 2;
  const canvasCenterY = v329fCanvasRect.top + v329fCanvasRect.height / 2;
  const v4905DiffX = v6c26TargetX - v1c56PlayerPos.x;
  const e404DiffY = targetY - v1c56PlayerPos.y;
  const v776eDistance = Math.sqrt(v4905DiffX * v4905DiffX + e404DiffY * e404DiffY);
  let smoothingScale = 1;
  if (v776eDistance > 5000) {
    smoothingScale = 3;
  } else if (v776eDistance > 2000) {
    smoothingScale = 2;
  } else if (v776eDistance > 1000) {
    smoothingScale = 1.5;
  } else if (v776eDistance > 500) {
    smoothingScale = 1.2;
  } else if (v776eDistance < 50) {
    smoothingScale = 0.5;
  } else if (v776eDistance < 150) {
    smoothingScale = 0.8;
  }
  let scaledX = v4905DiffX * smoothingScale;
  let scaledY = e404DiffY * smoothingScale;
  const v17f5MaxOffset = Math.min(v329fCanvasRect.width, v329fCanvasRect.height) * 0.85;
  const currentOffset = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
  if (currentOffset > v17f5MaxOffset) {
    const clampFactor = v17f5MaxOffset / currentOffset;
    scaledX *= clampFactor;
    scaledY *= clampFactor;
  }
  const finalX = canvasCenterX + scaledX;
  const finalY = canvasCenterY + scaledY;
  v5a94GameCanvas.dispatchEvent(new MouseEvent("pointermove", {
    clientX: finalX,
    clientY: finalY,
    bubbles: true,
    view: window
  }));
  if (shouldClick) {
    simulateClick(finalX, finalY);
  }
}
let mainIsProcessed = false;
const tickInterval = 600;
const deltaThreshold = 800;
let mainCurrentTime = 0;
let mainPosition = null;
let counter = 0;
let modCurrentTime = 0;
let dataList = [];
function autoDodgeLoop() {
  if (!mainIsProcessed) {
    return;
  }
  setTimeout(autoDodgeLoop, 80);
  if (!window.autoDodgeEnabled) {
    return;
  }
  try {
    const caeaPlayerPos = getFirstAnimalPosition();
    if (!caeaPlayerPos) {
      return;
    }
    const b8e9GameState = getGameState();
    const ef01Entities = getEntityManager(b8e9GameState);
    const myAnimal = b8e9GameState?.myAnimals?.[0];
    if (!ef01Entities || !myAnimal) {
      return;
    }
    let nearbyEntities = [];
    (ef01Entities.entitiesList || []).forEach(v2b24TargetEntity => {
      if (!v2b24TargetEntity || v2b24TargetEntity.id === myAnimal.id || !isPlayer(v2b24TargetEntity)) {
        return;
      }
      const v5a7bMyY = v2b24TargetEntity.position?._x !== undefined ? v2b24TargetEntity.position._x : v2b24TargetEntity.position?.x;
      const v1bdaPosY = v2b24TargetEntity.position?._y !== undefined ? v2b24TargetEntity.position._y : v2b24TargetEntity.position?.y;
      if (v5a7bMyY == null || v1bdaPosY == null) {
        return;
      }
      const distanceToTarget = calculateDistance(caeaPlayerPos.x, caeaPlayerPos.y, v5a7bMyY, v1bdaPosY);
      if (distanceToTarget < tickInterval) {
        nearbyEntities.push({
          x: v5a7bMyY,
          y: v1bdaPosY,
          dist: distanceToTarget
        });
      }
    });
    if (nearbyEntities.length === 0) {
      mainPosition = null;
      counter = 0;
      dataList = [];
      return;
    }
    const now = Date.now();
    let isDodging = false;
    if (now - modCurrentTime > 600) {
      modCurrentTime = now;
      if (mainPosition) {
        const moveDist = calculateDistance(caeaPlayerPos.x, caeaPlayerPos.y, mainPosition.x, mainPosition.y);
        if (moveDist < 20) {
          counter++;
          isDodging = true;
        } else {
          counter = 0;
          dataList = [];
        }
      }
      mainPosition = {
        x: caeaPlayerPos.x,
        y: caeaPlayerPos.y
      };
    }
    let sumX = 0;
    let sumY = 0;
    nearbyEntities.forEach(sourceEntity => {
      const v26b1DeltaX = caeaPlayerPos.x - sourceEntity.x;
      const v2233DeltaY = caeaPlayerPos.y - sourceEntity.y;
      const v49f9Distance = Math.sqrt(v26b1DeltaX * v26b1DeltaX + v2233DeltaY * v2233DeltaY);
      if (v49f9Distance > 0.01) {
        const distanceRatio = (tickInterval - sourceEntity.dist) / tickInterval;
        sumX += v26b1DeltaX / v49f9Distance * distanceRatio;
        sumY += v2233DeltaY / v49f9Distance * distanceRatio;
      }
    });
    let v1ac5Magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    if (v1ac5Magnitude < 0.01) {
      sumX = 1;
      sumY = 0;
      v1ac5Magnitude = 1;
    }
    sumX /= v1ac5Magnitude;
    sumY /= v1ac5Magnitude;
    let v3e0bAngle = Math.atan2(sumY, sumX);
    if (isDodging && counter >= 1) {
      const anglePresets = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 3 / 4, -Math.PI * 3 / 4];
      let currentAngle = v3e0bAngle;
      let maxProjection = -Infinity;
      for (const angleOffset of anglePresets) {
        const rotatedAngle = v3e0bAngle + angleOffset;
        if (dataList.some(c08aMyY => Math.abs(c08aMyY - rotatedAngle) < 0.3) && counter < 5) {
          continue;
        }
        let projection = 0;
        nearbyEntities.forEach(v5a3bEntity => {
          projection -= Math.cos(rotatedAngle) * (v5a3bEntity.x - caeaPlayerPos.x) + Math.sin(rotatedAngle) * (v5a3bEntity.y - caeaPlayerPos.y);
        });
        if (projection > maxProjection) {
          maxProjection = projection;
          currentAngle = rotatedAngle;
        }
      }
      v3e0bAngle = currentAngle;
      dataList.push(v3e0bAngle);
      if (dataList.length > 8) {
        dataList.shift();
      }
      if (counter >= 5) {
        v3e0bAngle += Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
        counter = 0;
        dataList = [];
      }
    }
    const v5c2fAngle = now - mainCurrentTime > deltaThreshold;
    if (v5c2fAngle) {
      mainCurrentTime = now;
    }
    aimAtTarget(caeaPlayerPos.x + Math.cos(v3e0bAngle) * 2000, caeaPlayerPos.y + Math.sin(v3e0bAngle) * 2000, v5c2fAngle);
  } catch (v5c4fData) {}
}
function enableAutoDodge() {
  window.autoDodgeEnabled = true;
  mainPosition = null;
  counter = 0;
  dataList = [];
  if (!mainIsProcessed) {
    mainIsProcessed = true;
    autoDodgeLoop();
  }
  showNotification("Auto dodge enabled");
}
function toggleEsp() {
  window.autoDodgeEnabled = false;
  showNotification("Auto dodge disabled");
}
const numOffsetValue = 400;
const maxFailCount = 2;
const timeoutLimit = 20000;
let numCounter = 0;
const numTickInterval = 600;
function handleFarmFailure(x, y) {
  const v4ffdCurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(v2b25CurrentTime => v4ffdCurrentTime - v2b25CurrentTime.time < timeoutLimit);
  let existingArea = window.autoFarmSkipAreas.find(v17b3Position => calculateDistance(x, y, v17b3Position.x, v17b3Position.y) < numOffsetValue);
  if (existingArea) {
    existingArea.failCount++;
    existingArea.time = v4ffdCurrentTime;
    if (existingArea.failCount >= maxFailCount) {
      existingArea.skipped = true;
      showNotification("Skipping unreachable food area");
    }
  } else {
    window.autoFarmSkipAreas.push({
      x: x,
      y: y,
      radius: numOffsetValue,
      time: v4ffdCurrentTime,
      failCount: 1,
      skipped: false
    });
  }
}
function isAreaSkipped(v16a6X, v52e9Y) {
  const v3477CurrentTime = Date.now();
  window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter(timer => v3477CurrentTime - timer.time < timeoutLimit);
  return window.autoFarmSkipAreas.some(cell => cell.skipped && calculateDistance(v16a6X, v52e9Y, cell.x, cell.y) < cell.radius);
}
function findClosestFarmableEntity(farmRange) {
  farmRange = farmRange || window.autoFarmRange;
  try {
    const v5c43GameState = getGameState();
    const v45c7EntityManager = getEntityManager(v5c43GameState);
    const playerAnimal = v5c43GameState?.myAnimals?.[0];
    if (!v45c7EntityManager || !playerAnimal) {
      return null;
    }
    const playerX = playerAnimal.position._x !== undefined ? playerAnimal.position._x : playerAnimal.position.x;
    const playerY = playerAnimal.position._y !== undefined ? playerAnimal.position._y : playerAnimal.position.y;
    let closestEntity = null;
    let minDistance = Infinity;
    (v45c7EntityManager.entitiesList || []).forEach(v4a84TargetEntity => {
      if (!v4a84TargetEntity || v4a84TargetEntity.id === playerAnimal.id || window.autoFarmSkipIds.has(v4a84TargetEntity.id)) {
        return;
      }
      const v155dMyY = v4a84TargetEntity.position?._x !== undefined ? v4a84TargetEntity.position._x : v4a84TargetEntity.position?.x;
      const v3f5dPosY = v4a84TargetEntity.position?._y !== undefined ? v4a84TargetEntity.position._y : v4a84TargetEntity.position?.y;
      if (v155dMyY == null || v3f5dPosY == null || isPlayer(v4a84TargetEntity) || isAreaSkipped(v155dMyY, v3f5dPosY)) {
        return;
      }
      const v1dd0DistanceToTarget = calculateDistance(playerX, playerY, v155dMyY, v3f5dPosY);
      if (v1dd0DistanceToTarget < minDistance && v1dd0DistanceToTarget < farmRange) {
        minDistance = v1dd0DistanceToTarget;
        closestEntity = {
          id: v4a84TargetEntity.id,
          x: v155dMyY,
          y: v3f5dPosY,
          distance: v1dd0DistanceToTarget,
          entity: v4a84TargetEntity
        };
      }
    });
    return closestEntity;
  } catch (v4e05Error) {
    return null;
  }
}
function getNearbyFarmTargets(v46e0FarmRange) {
  v46e0FarmRange = v46e0FarmRange || window.autoFarmRange;
  try {
    const v4c14GameState = getGameState();
    const v10c2Entities = getEntityManager(v4c14GameState);
    const v5472MyAnimal = v4c14GameState?.myAnimals?.[0];
    if (!v10c2Entities || !v5472MyAnimal) {
      return [];
    }
    const myPosX = v5472MyAnimal.position._x !== undefined ? v5472MyAnimal.position._x : v5472MyAnimal.position.x;
    const myPosY = v5472MyAnimal.position._y !== undefined ? v5472MyAnimal.position._y : v5472MyAnimal.position.y;
    const targets = [];
    (v10c2Entities.entitiesList || []).forEach(v5579TargetEntity => {
      if (!v5579TargetEntity || v5579TargetEntity.id === v5472MyAnimal.id || window.autoFarmSkipIds.has(v5579TargetEntity.id)) {
        return;
      }
      const v371eMyY = v5579TargetEntity.position?._x !== undefined ? v5579TargetEntity.position._x : v5579TargetEntity.position?.x;
      const v2363PosY = v5579TargetEntity.position?._y !== undefined ? v5579TargetEntity.position._y : v5579TargetEntity.position?.y;
      if (v371eMyY == null || v2363PosY == null || isPlayer(v5579TargetEntity) || isAreaSkipped(v371eMyY, v2363PosY)) {
        return;
      }
      const v44cbDistanceToTarget = calculateDistance(myPosX, myPosY, v371eMyY, v2363PosY);
      if (v44cbDistanceToTarget < v46e0FarmRange) {
        targets.push({
          id: v5579TargetEntity.id,
          x: v371eMyY,
          y: v2363PosY,
          distance: v44cbDistanceToTarget,
          entity: v5579TargetEntity
        });
      }
    });
    return targets.sort((entityA, entityB) => entityA.distance - entityB.distance);
  } catch (v2369Err) {
    return [];
  }
}
function findBestFarmSpot(searchRadius, v1ea1FarmRange) {
  const targetPoints = getNearbyFarmTargets(v1ea1FarmRange || window.autoFarmRange);
  if (!targetPoints.length) {
    return null;
  }
  let bestSpot = null;
  let maxPointCount = 0;
  targetPoints.forEach(calculateAveragePosition => {
    let count = 0;
    let v5959SumX = 0;
    let v1907SumY = 0;
    targetPoints.forEach(targetPosition => {
      if (calculateDistance(calculateAveragePosition.x, calculateAveragePosition.y, targetPosition.x, targetPosition.y) < (searchRadius || 500)) {
        count++;
        v5959SumX += targetPosition.x;
        v1907SumY += targetPosition.y;
      }
    });
    if (count > maxPointCount) {
      maxPointCount = count;
      bestSpot = {
        x: v5959SumX / count,
        y: v1907SumY / count,
        foodCount: count
      };
    }
  });
  return bestSpot;
}
function calculatePlayerAvoidanceVector() {
  if (!window.autoFarmAvoidPlayers) {
    return {
      x: 0,
      y: 0
    };
  }
  const playerPosition = getFirstAnimalPosition();
  if (!playerPosition) {
    return {
      x: 0,
      y: 0
    };
  }
  let avoidX = 0;
  let avoidY = 0;
  try {
    const v5dc5GameState = getGameState();
    const v420fEntities = getEntityManager(v5dc5GameState);
    const v1f3dMyAnimal = v5dc5GameState?.myAnimals?.[0];
    if (!v420fEntities || !v1f3dMyAnimal) {
      return {
        x: 0,
        y: 0
      };
    }
    (v420fEntities.entitiesList || []).forEach(v2555TargetEntity => {
      if (!v2555TargetEntity || v2555TargetEntity.id === v1f3dMyAnimal.id || !isPlayer(v2555TargetEntity)) {
        return;
      }
      const v498dMyY = v2555TargetEntity.position?._x !== undefined ? v2555TargetEntity.position._x : v2555TargetEntity.position?.x;
      const v195ePosY = v2555TargetEntity.position?._y !== undefined ? v2555TargetEntity.position._y : v2555TargetEntity.position?.y;
      if (v498dMyY == null || v195ePosY == null) {
        return;
      }
      const currentDistance = calculateDistance(playerPosition.x, playerPosition.y, v498dMyY, v195ePosY);
      if (currentDistance < window.autoFarmAvoidDistance) {
        const v2047DeltaX = playerPosition.x - v498dMyY;
        const v2f2aDeltaY = playerPosition.y - v195ePosY;
        const v3a21Distance = Math.sqrt(v2047DeltaX * v2047DeltaX + v2f2aDeltaY * v2f2aDeltaY);
        const avoidanceFactor = (window.autoFarmAvoidDistance - Math.max(currentDistance, 50)) / window.autoFarmAvoidDistance;
        if (v3a21Distance > 0) {
          avoidX += v2047DeltaX / v3a21Distance * avoidanceFactor * 500;
          avoidY += v2f2aDeltaY / v3a21Distance * avoidanceFactor * 500;
        }
      }
    });
  } catch (v1d6aData) {}
  return {
    x: avoidX,
    y: avoidY
  };
}
let currentTime = 0;
function simulateEvolveKey() {
  if (!window.autoFarmEvolve) {
    return;
  }
  const v36baCurrentTime = Date.now();
  if (v36baCurrentTime - currentTime < 5000) {
    return;
  }
  currentTime = v36baCurrentTime;
  const v4a4cGameCanvas = getGameCanvas();
  const randomDigit = String(Math.floor(Math.random() * 9) + 1);
  const keyboardEventOptions = {
    key: randomDigit,
    code: "Digit" + randomDigit,
    keyCode: randomDigit.charCodeAt(0),
    which: randomDigit.charCodeAt(0),
    bubbles: true,
    cancelable: true
  };
  [window, document, document.body, v4a4cGameCanvas].forEach(v201eTargetElement => {
    if (!v201eTargetElement) {
      return;
    }
    try {
      v201eTargetElement.dispatchEvent(new KeyboardEvent("keydown", keyboardEventOptions));
      setTimeout(() => v201eTargetElement.dispatchEvent(new KeyboardEvent("keyup", keyboardEventOptions)), 50);
    } catch (v4414Data) {}
  });
}
let globalIsToggled = false;
let appPosition = null;
let modCounter = 0;
let counter = 0;
let numAngle = 0;
let sysCurrentTime = 0;
function detectAndHandleStuck(currentPos) {
  const v47c3Now = Date.now();
  if (v47c3Now - counter < 1500) {
    return false;
  }
  counter = v47c3Now;
  if (appPosition) {
    if (calculateDistance(currentPos.x, currentPos.y, appPosition.x, appPosition.y) < 25) {
      modCounter++;
      if (modCounter >= 1 && window.autoFarmCurrentTarget) {
        handleFarmFailure(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
        window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        modCounter = 0;
      }
      if (modCounter >= 2) {
        modCounter = 0;
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const randomAngle = Math.random() * Math.PI * 2;
        aimAtTarget(currentPos.x + Math.cos(randomAngle) * 1500, currentPos.y + Math.sin(randomAngle) * 1500, true);
        return true;
      }
    } else {
      modCounter = 0;
    }
  }
  appPosition = {
    x: currentPos.x,
    y: currentPos.y
  };
  return false;
}
function setupPatrolPoints() {
  const centerPos = getFirstAnimalPosition();
  if (!centerPos) {
    return;
  }
  window.autoFarmPatrolPoints = [];
  for (let v4f78I = 0; v4f78I < 6; v4f78I++) {
    const v2367Angle = Math.PI * 2 * v4f78I / 6;
    window.autoFarmPatrolPoints.push({
      x: centerPos.x + Math.cos(v2367Angle) * 2000,
      y: centerPos.y + Math.sin(v2367Angle) * 2000
    });
  }
  window.autoFarmPatrolIndex = 0;
}
function autoFarmLoop() {
  if (!window.autoFarmActive) {
    globalIsToggled = false;
    return;
  }
  const aa3cNow = Date.now();
  if (aa3cNow - window.autoFarmSkipClearTime > 15000) {
    window.autoFarmSkipIds.clear();
    window.autoFarmSkipClearTime = aa3cNow;
  }
  if (window.autoFarmCurrentTarget && window.autoFarmTargetStartTime > 0 && aa3cNow - window.autoFarmTargetStartTime > 1000) {
    handleFarmFailure(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
    window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
    window.autoFarmCurrentTarget = null;
    window.autoFarmTargetStartTime = 0;
    setTimeout(autoFarmLoop, 100);
    return;
  }
  try {
    const player = getFirstAnimalPosition();
    if (!player) {
      window.autoFarmActive = false;
      globalIsToggled = false;
      const autoFarmBtnElement = document.getElementById("autoFarmBtn");
      if (autoFarmBtnElement) {
        autoFarmBtnElement.textContent = "Auto Farm";
        autoFarmBtnElement.classList.remove("toggle-on");
      }
      return;
    }
    if (Math.random() < 0.015) {
      simulateEvolveKey();
    }
    if (detectAndHandleStuck(player)) {
      setTimeout(autoFarmLoop, 100);
      return;
    }
    const playerOffset = calculatePlayerAvoidanceVector();
    if ((Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) && window.autoFarmAvoidPlayers) {
      const canBoost = window.autoFarmBoost && aa3cNow - numCounter > numTickInterval;
      if (canBoost) {
        numCounter = aa3cNow;
      }
      aimAtTarget(player.x + playerOffset.x, player.y + playerOffset.y, canBoost);
      setTimeout(autoFarmLoop, 60);
      return;
    }
    let v24d1TargetX = null;
    let v1ecbTargetY = null;
    let v2648MinDistance = Infinity;
    if (window.autoFarmMode === "nearest") {
      const nearestTarget = findClosestFarmableEntity();
      if (nearestTarget) {
        v24d1TargetX = nearestTarget.x + playerOffset.x * 0.3;
        v1ecbTargetY = nearestTarget.y + playerOffset.y * 0.3;
        v2648MinDistance = nearestTarget.distance;
        if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== nearestTarget.id) {
          if (window.autoFarmCurrentTarget) {
            window.autoFarmStats.collected++;
          }
          window.autoFarmCurrentTarget = nearestTarget;
          window.autoFarmTargetStartTime = aa3cNow;
          modCounter = 0;
        }
        if (nearestTarget.distance < 40) {
          v24d1TargetX += (Math.random() - 0.5) * 80;
          v1ecbTargetY += (Math.random() - 0.5) * 80;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        if (aa3cNow - sysCurrentTime > 2500) {
          numAngle = Math.random() * Math.PI * 2;
          sysCurrentTime = aa3cNow;
        }
        v24d1TargetX = player.x + Math.cos(numAngle) * 1000;
        v1ecbTargetY = player.y + Math.sin(numAngle) * 1000;
        v2648MinDistance = 1000;
      }
    } else if (window.autoFarmMode === "cluster") {
      const foodSource = findBestFarmSpot(500, window.autoFarmRange);
      if (foodSource && foodSource.foodCount >= 2) {
        v24d1TargetX = foodSource.x + playerOffset.x * 0.3;
        v1ecbTargetY = foodSource.y + playerOffset.y * 0.3;
        v2648MinDistance = calculateDistance(player.x, player.y, foodSource.x, foodSource.y);
      } else {
        const selectedTarget = findClosestFarmableEntity();
        if (selectedTarget) {
          v24d1TargetX = selectedTarget.x;
          v1ecbTargetY = selectedTarget.y;
          v2648MinDistance = selectedTarget.distance;
          if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== selectedTarget.id) {
            window.autoFarmCurrentTarget = selectedTarget;
            window.autoFarmTargetStartTime = aa3cNow;
          }
        } else {
          window.autoFarmCurrentTarget = null;
          window.autoFarmTargetStartTime = 0;
          if (aa3cNow - sysCurrentTime > 2500) {
            numAngle = Math.random() * Math.PI * 2;
            sysCurrentTime = aa3cNow;
          }
          v24d1TargetX = player.x + Math.cos(numAngle) * 1000;
          v1ecbTargetY = player.y + Math.sin(numAngle) * 1000;
          v2648MinDistance = 1000;
        }
      }
    } else if (window.autoFarmMode === "patrol") {
      if (!window.autoFarmPatrolPoints.length) {
        setupPatrolPoints();
      }
      const v4f14SelectedTarget = findClosestFarmableEntity(800);
      if (v4f14SelectedTarget) {
        v24d1TargetX = v4f14SelectedTarget.x;
        v1ecbTargetY = v4f14SelectedTarget.y;
        v2648MinDistance = v4f14SelectedTarget.distance;
        if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== v4f14SelectedTarget.id) {
          window.autoFarmCurrentTarget = v4f14SelectedTarget;
          window.autoFarmTargetStartTime = aa3cNow;
        }
      } else {
        window.autoFarmCurrentTarget = null;
        window.autoFarmTargetStartTime = 0;
        const currentPatrolPoint = window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
        if (currentPatrolPoint) {
          v2648MinDistance = calculateDistance(player.x, player.y, currentPatrolPoint.x, currentPatrolPoint.y);
          if (v2648MinDistance < 200) {
            window.autoFarmPatrolIndex = (window.autoFarmPatrolIndex + 1) % window.autoFarmPatrolPoints.length;
          }
          v24d1TargetX = currentPatrolPoint.x;
          v1ecbTargetY = currentPatrolPoint.y;
        }
      }
    }
    if (v24d1TargetX != null) {
      const v5c90Angle = window.autoFarmBoost && v2648MinDistance > 350 && aa3cNow - numCounter > numTickInterval;
      if (v5c90Angle) {
        numCounter = aa3cNow;
      }
      aimAtTarget(v24d1TargetX, v1ecbTargetY, v5c90Angle);
    }
  } catch (v9236Data) {
    console.error("[AutoFarm]", v9236Data);
  }
  setTimeout(autoFarmLoop, 60);
}
function startAutoFarm(farmMode) {
  window.autoFarmMode = farmMode || "nearest";
  window.autoFarmActive = true;
  window.autoFarmStats.startTime = Date.now();
  window.autoFarmStats.collected = 0;
  window.autoFarmCurrentTarget = null;
  window.autoFarmTargetStartTime = 0;
  window.autoFarmSkipIds.clear();
  window.autoFarmSkipAreas = [];
  window.autoFarmSkipClearTime = Date.now();
  appPosition = null;
  modCounter = 0;
  counter = 0;
  numCounter = 0;
  if (farmMode === "patrol") {
    setupPatrolPoints();
  }
  showNotification("Auto farm started (" + window.autoFarmMode + ")");
  if (!globalIsToggled) {
    globalIsToggled = true;
    autoFarmLoop();
  }
}
function stopAutoFarm() {
  window.autoFarmActive = false;
  globalIsToggled = false;
  showNotification("Farm stopped. ~" + window.autoFarmStats.collected + " food in " + ((Date.now() - window.autoFarmStats.startTime) / 1000).toFixed(0) + "s");
}
function toggleMinimapSize() {
  if (!playerData || !playerData.minimap) {
    showNotification("Minimap not available");
    return;
  }
  if (boolIsToggled) {
    playerData.minimap.scale.set(1);
    playerData.minimap.pivot.set(0, 0);
    boolIsToggled = false;
    showNotification("Minimap restored");
  } else {
    playerData.minimap.scale.set(0.5);
    playerData.minimap.pivot.set(-70, -45);
    boolIsToggled = true;
    showNotification("Small minimap enabled");
  }
}
let isProcessed = false;
const initGameHooks = () => {
  if (isProcessed) {
    return;
  }
  isProcessed = true;
  const cache = {};
  for (const v15b7PropertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[v15b7PropertyKey] = Reflect[v15b7PropertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (v5946Target, url, value) => {
    const wrappedValue = new ProxyConstructor(v5946Target[url], value);
    stateCache.set(wrappedValue, v5946Target[url]);
    v5946Target[url] = wrappedValue;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisArg, argsKey, context) {
      return cache.apply(thisArg, stateCache.get(argsKey) || argsKey, context);
    }
  });
  wrapValue(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    }
  });
  wrapValue(ProxyConstructor, "revocable", {
    apply(targetContext, argsArray, extraArgs) {
      return cache.apply(targetContext, argsArray, extraArgs);
    }
  });
  let lastTimestamp = 0;
  wrapValue(Function.prototype, "bind", {
    apply(thisContext, v5ecaArgsArray, extraParam) {
      try {
        try {
          if (lookupGetter.call(extraParam[0], "aboveBgPlatformsContainer") != null) {
            return cache.apply(thisContext, v5ecaArgsArray, extraParam);
          }
        } catch {}
        if (extraParam[0] && extraParam[0].aboveBgPlatformsContainer != null) {
          playerData = extraParam[0];
          gameInstance = extraParam[0].game;
          window.__cachedEM = null;
          const allKeys = getAllPropertyNames(playerData);
          const obfuscatedKeys = allKeys.filter(varName => varName.startsWith("_0x"));
          config.setFlash = Object.getOwnPropertyNames(playerData.__proto__.__proto__).filter(identifier => identifier.startsWith("_0x")).find(functionKey => playerData[functionKey] instanceof Function) || config.setFlash;
          config.terrainManager = obfuscatedKeys.find(shadowKey => typeof playerData[shadowKey]?.shadow !== "undefined") || config.terrainManager;
          config.entityManager = obfuscatedKeys.find(entitiesKey => typeof playerData[entitiesKey]?.entitiesList !== "undefined") || config.entityManager;
          config.socketManager = getAllPropertyNames(gameInstance).find(networkKey => typeof gameInstance[networkKey]?.sendBytePacket !== "undefined") || config.socketManager;
          try {
            State = document.getElementById("app")._vnode.appContext.config.globalProperties.$simpleState.states.find(gameStore => gameStore._storeMeta.id === "game");
          } catch {}
          let intervalId;
          try {
            clearInterval(intervalId);
          } catch {}
          intervalId = setInterval(() => {
            try {
              if (!playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = playerData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                wrapWithProxy(Object.getPrototypeOf(firstAnimal.fadingTrail), "enable", {
                  apply() {}
                });
              }
              if (firstAnimal.bubblesEmitter) {
                Object.defineProperty(Object.getPrototypeOf(firstAnimal.bubblesEmitter), "emit", {
                  set: () => {}
                });
              }
              clearInterval(intervalId);
            } catch {}
          }, 200);
          if (lastTimestamp < Date.now() - 3000) {
            showNotification("Client loaded");
            lastTimestamp = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisContext, v5ecaArgsArray, extraParam);
    }
  });
};
const initializeAstraVision = () => {
  if (globalIsProcessed) {
    return;
  }
  if (!playerData) {
    setTimeout(initializeAstraVision, 500);
    return;
  }
  try {
    if (playerData.terrainManager && playerData.terrainManager.shadow) {
      playerData.terrainManager.shadow.setShadowSize(1000000);
      playerData.terrainManager.shadow.setShadowSize = () => {};
    } else {
      for (let key1 in playerData) {
        if (playerData[key1] && playerData[key1].shadow) {
          playerData[key1].shadow.setShadowSize(1000000);
          playerData[key1].shadow.setShadowSize = () => {};
        }
      }
    }
    if (typeof playerData.setFlash === "function") {
      playerData.setFlash = () => {};
    } else {
      for (let key2 of Object.getOwnPropertyNames(playerData.__proto__)) {
        if (key2.startsWith("_0x") && typeof playerData[key2] === "function") {
          playerData[key2] = () => {};
        }
      }
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
    showNotification("Astra-Vision active");
  } catch (v5479Url) {
    console.error("AstraVision Error:", v5479Url);
  }
  globalIsProcessed = true;
};
function showHalloweenModal(onUnlockCallback) {
  const modalContainer = document.createElement("div");
  modalContainer.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
  modalContainer.innerHTML = "<div style=\"background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;\">\n      <div style=\"color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;\">Halloween Access Code</div>\n      <input id=\"hwCodeInput\" type=\"text\" placeholder=\"Enter code...\" style=\"background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;\">\n      <div style=\"display:flex;gap:8px;\">\n        <button id=\"hwCancelBtn\" style=\"flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;\">Cancel</button>\n        <button id=\"hwSubmitBtn\" style=\"flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-weight:600;\">Redeem</button>\n      </div></div>";
  document.body.appendChild(modalContainer);
  setTimeout(() => {
    modalContainer.style.opacity = "1";
  }, 10);
  const codeInput = modalContainer.querySelector("#hwCodeInput");
  const closeModal = () => {
    modalContainer.style.opacity = "0";
    setTimeout(() => modalContainer.remove(), 300);
  };
  modalContainer.querySelector("#hwSubmitBtn").onclick = () => {
    const inputCode = codeInput.value.trim();
    if (inputCode === "HappyHalloween9" || inputCode === "TrickOrTreat9") {
      localStorage.setItem("halloweenUnlocked", "true");
      showNotification("Halloween theme unlocked");
      closeModal();
      onUnlockCallback(true);
    } else {
      codeInput.style.borderColor = "#ff0000";
      setTimeout(() => {
        codeInput.style.borderColor = "#333";
      }, 500);
      showNotification("Invalid code");
    }
  };
  modalContainer.querySelector("#hwCancelBtn").onclick = () => {
    closeModal();
    onUnlockCallback(false);
  };
  codeInput.addEventListener("keypress", event => {
    if (event.key === "Enter") {
      modalContainer.querySelector("#hwSubmitBtn").click();
    }
  });
  codeInput.focus();
}
function makeDraggable(element) {
  let v26b8OffsetX;
  let v58cdOffsetY;
  let isDragging = false;
  let hasMoved = false;
  element.addEventListener("mousedown", v5309Event => {
    if (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"].includes(v5309Event.target.tagName)) {
      return;
    }
    if (v5309Event.target.closest("button,input,textarea,select,label")) {
      return;
    }
    isDragging = true;
    hasMoved = false;
    v26b8OffsetX = v5309Event.clientX - element.getBoundingClientRect().left;
    v58cdOffsetY = v5309Event.clientY - element.getBoundingClientRect().top;
    element.style.transition = "none";
    const handleMouseMove = v2a7cEvent => {
      if (!hasMoved && (Math.abs(v2a7cEvent.clientX - v5309Event.clientX) > 5 || Math.abs(v2a7cEvent.clientY - v5309Event.clientY) > 5)) {
        hasMoved = true;
      }
      if (isDragging) {
        element.style.left = v2a7cEvent.clientX - v26b8OffsetX + "px";
        element.style.top = v2a7cEvent.clientY - v58cdOffsetY + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
      }
    };
    const handleMouseUp = () => {
      isDragging = false;
      element.style.transition = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  element.addEventListener("click", v5d21Event => {
    if (hasMoved) {
      v5d21Event.stopImmediatePropagation();
    }
  });
}
function applyTheme(themeName) {
  const rootElement = document.documentElement;
  const savedThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
  const defaultThemes = {
    grey: {
      acc: "#888888",
      accH: "#aaaaaa",
      accRGB: "136,136,136",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    blue: {
      acc: "#4fc3f7",
      accH: "#81d4fa",
      accRGB: "79,195,247",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    red: {
      acc: "#ef5350",
      accH: "#e57373",
      accRGB: "239,83,80",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    green: {
      acc: "#66bb6a",
      accH: "#81c784",
      accRGB: "102,187,106",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    pink: {
      acc: "#f06292",
      accH: "#f48fb1",
      accRGB: "240,98,146",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    starwars: {
      acc: "#ffd740",
      accH: "#ffe082",
      accRGB: "255,215,64",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    kfc: {
      acc: "#f44336",
      accH: "#e57373",
      accRGB: "244,67,54",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    halloween: {
      acc: "#ff6600",
      accH: "#ff8833",
      accRGB: "255,102,0",
      text: "#e0e0e0",
      textSec: "#888",
      bg1: "#1a1a1a",
      bg2: "#242424",
      bg3: "#2a2a2a",
      border: "#333",
      hover: "#2e2e2e"
    },
    ...savedThemes
  };
  const myY = defaultThemes[themeName] ? themeName : "grey";
  const themeValue = defaultThemes[myY];
  Object.entries({
    "--acc": themeValue.acc,
    "--acc-h": themeValue.accH,
    "--acc-rgb": themeValue.accRGB,
    "--text": themeValue.text,
    "--text-sec": themeValue.textSec,
    "--bg1": themeValue.bg1,
    "--bg2": themeValue.bg2,
    "--bg3": themeValue.bg3,
    "--bdr": themeValue.border,
    "--hvr": themeValue.hover
  }).forEach(([styleProperty, styleValue]) => rootElement.style.setProperty(styleProperty, styleValue));
  localStorage.setItem("theme", myY);
}
function initBackground() {
  const backgroundUrl = localStorage.getItem("bgUrl") || "";
  if (!backgroundUrl) {
    return;
  }
  const setBackgroundImage = () => {
    const homeBackground = document.querySelector(".home-bg");
    if (homeBackground) {
      homeBackground.style.setProperty("background-image", "url(\"" + backgroundUrl + "\")", "important");
    }
  };
  if (!document.querySelector(".home-bg")) {
    const bgCheckInterval = setInterval(() => {
      if (document.querySelector(".home-bg")) {
        clearInterval(bgCheckInterval);
        setBackgroundImage();
      }
    }, 100);
  } else {
    setBackgroundImage();
  }
}
function injectStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = "\n      .ast-panel{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg1,#1a1a1a);color:var(--text,#e0e0e0);border-radius:6px;position:fixed;z-index:99999;user-select:none;cursor:move;font-size:13px;min-width:220px;overflow:hidden;}\n      .ast-header{background:var(--header-bg,var(--bg2,#242424));padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bdr,#333);}\n      .ast-header-title{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--header-title,var(--acc,#888));}\n      .ast-header-min{background:none;border:none;color:var(--text-sec,#888);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;}\n      .ast-header-min:hover{color:var(--text,#e0e0e0);}\n      .ast-body{padding:8px 12px 12px 12px;}\n      .ast-section-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--section-label,var(--text-sec,#888));padding:8px 0 4px 2px;display:block;}\n      .ast-btn{display:block;width:100%;background:var(--btn-bg,var(--bg2,#242424));color:var(--btn-text,var(--text,#e0e0e0));border:none;border-radius:4px;padding:8px 10px;font-size:12px;font-weight:500;cursor:pointer;text-align:left;transition:background .12s;margin-bottom:3px;font-family:inherit;position:relative;}\n      .ast-btn:hover:not(:disabled){background:var(--btn-hover,var(--hvr,#2e2e2e));}\n      .ast-btn:disabled{opacity:.35;cursor:not-allowed;}\n      .ast-btn.toggle-on{color:var(--acc,#888);}\n      .ast-btn.toggle-on::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--acc,#888);border-radius:1px;}\n      .ast-btn.patched{opacity:.25;text-decoration:line-through;cursor:not-allowed;}\n      .ast-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:5px 2px;font-size:12px;}\n      .ast-toggle-row label{color:var(--text,#e0e0e0);cursor:pointer;}\n      .ast-switch{position:relative;width:32px;height:18px;flex-shrink:0;}\n      .ast-switch input{opacity:0;width:0;height:0;position:absolute;}\n      .ast-switch .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--switch-bg,#333);border-radius:9px;transition:background .2s;}\n      .ast-switch .slider::before{content:'';position:absolute;height:14px;width:14px;left:2px;bottom:2px;background:var(--switch-knob,#888);border-radius:50%;transition:transform .2s,background .2s;}\n      .ast-switch input:checked+.slider{background:var(--switch-active-bg,rgba(var(--acc-rgb,136,136,136),.3));}\n      .ast-switch input:checked+.slider::before{transform:translateX(14px);background:var(--acc,#888);}\n      .ast-select{width:100%;background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:6px 8px;font-size:12px;cursor:pointer;outline:none;font-family:inherit;margin-bottom:3px;appearance:none;}\n      .ast-select:focus{border-color:var(--acc,#888);}\n      .ast-input{background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:6px 8px;font-size:12px;outline:none;font-family:inherit;}\n      .ast-input:focus{border-color:var(--acc,#888);}\n      .ast-input::placeholder{color:var(--placeholder,#555);}\n      .ast-textarea{background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:8px;font-size:12px;outline:none;font-family:inherit;resize:none;width:100%;box-sizing:border-box;}\n      .ast-textarea:focus{border-color:var(--acc,#888);}\n      .ast-textarea::placeholder{color:var(--placeholder,#555);}\n      .ast-key-row{display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:12px;margin-bottom:3px;}\n      .ast-key-row span{color:var(--text,#e0e0e0);}\n      .ast-key-capture{background:var(--key-bg,var(--bg2,#242424));border:1px solid var(--input-border,var(--bdr,#333));color:var(--key-text,var(--acc,#888));border-radius:4px;padding:4px 10px;font-size:11px;text-align:center;min-width:50px;cursor:pointer;outline:none;font-family:'Consolas',monospace;font-weight:600;}\n      .ast-key-capture:focus{border-color:var(--acc,#888);}\n      .ast-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}\n      .ast-row .ast-input{flex:1;}\n      .ast-credits{padding-top:8px;font-size:10px;color:var(--muted,#555);line-height:1.5;text-align:center;}\n      .ast-sep{height:1px;background:var(--bdr,#333);margin:6px 0;}\n      .ast-update-list{margin:0;padding-left:16px;font-size:11px;color:var(--list-text,var(--text-sec,#888));line-height:1.6;}\n      .ast-update-list li{margin-bottom:4px;}\n      div.sidebar.left>div.ad-block{opacity:0!important;pointer-events:none!important;display:none!important;}\n      div.sidebar.left>a{display:none!important;}\n      div.sidebar.left{max-width:30vw;width:21rem;bottom:0!important;}\n    ";
  document.head.appendChild(styleElement);
}
function createToolsPanel() {
  const toolsPanel = document.createElement("div");
  toolsPanel.id = "deep-tools-panel";
  toolsPanel.className = "ast-panel";
  toolsPanel.style.cssText = "bottom:20px;right:20px;width:230px;";
  toolsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"mainMin\">−</button></div>\n      <div class=\"ast-body\" id=\"mainBody\">\n        <span class=\"ast-section-label\">Chat</span>\n        <textarea class=\"ast-textarea\" id=\"chatMsg\" placeholder=\"Message...\" rows=\"2\"></textarea>\n        <button class=\"ast-btn\" id=\"sendBtn\">Send Chat</button>\n        <div class=\"ast-row\" style=\"margin-top:4px;\">\n          <input class=\"ast-input\" type=\"number\" id=\"delayInput\" min=\"1\" max=\"300\" value=\"10\" style=\"width:50px;text-align:center;\">\n          <span style=\"font-size:11px;color:#888;\">sec</span>\n          <button class=\"ast-btn\" id=\"autoChatBtn\" style=\"flex:1;margin-bottom:0;\">Auto Chat</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tools</span>\n        <button class=\"ast-btn\" id=\"patchBtn\">Special Characters</button>\n        <button class=\"ast-btn\" id=\"spoofBtn\">Spoof Username</button>\n        <button class=\"ast-btn\" id=\"spinBtn\">Auto Spin</button>\n        <div class=\"ast-key-row\"><span>Spin key</span><input class=\"ast-key-capture\" id=\"spinKeyInput\" type=\"text\" placeholder=\"...\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Turn Controls</span>\n        <div class=\"ast-key-row\">\n          <span>Turn Left</span>\n          <input class=\"ast-key-capture\" id=\"turnLeftKeyInput\" type=\"text\" value=\"Q\" readonly>\n        </div>\n        <div class=\"ast-key-row\">\n          <span>Turn Right</span>\n          <input class=\"ast-key-capture\" id=\"turnRightKeyInput\" type=\"text\" value=\"E\" readonly>\n        </div>\n        <div class=\"ast-credits\">Made by Astraphobia</div>\n      </div>";
  document.body.appendChild(toolsPanel);
  const Body = toolsPanel.querySelector("#mainBody");
  let isHidden = false;
  toolsPanel.querySelector("#mainMin").onclick = toggleEvent => {
    toggleEvent.stopPropagation();
    isHidden = !isHidden;
    Body.style.display = isHidden ? "none" : "block";
    toolsPanel.querySelector("#mainMin").textContent = isHidden ? "+" : "−";
  };
  toolsPanel.querySelector("#sendBtn").onclick = () => {
    const chatMessage = toolsPanel.querySelector("#chatMsg").value;
    if (chatMessage) {
      typeAndSendMessage(chatMessage);
    }
  };
  const spinBtn = toolsPanel.querySelector("#autoChatBtn");
  spinBtn.onclick = () => {
    const chatInputContent = toolsPanel.querySelector("#chatMsg").value;
    const messageDelay = parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
    if (!chatInputContent) {
      showNotification("Enter a message first");
      return;
    }
    if (isToggled) {
      stopInterval();
      spinBtn.textContent = "Auto Chat";
      spinBtn.classList.remove("toggle-on");
    } else {
      startScheduledTask(chatInputContent, messageDelay);
      spinBtn.textContent = "Stop Chat";
      spinBtn.classList.add("toggle-on");
    }
  };
  const patchBtn = toolsPanel.querySelector("#patchBtn");
  patchBtn.onclick = () => {
    interceptTextEncoder();
    patchBtn.textContent = "Special Chars Active";
    patchBtn.disabled = true;
    patchBtn.classList.add("toggle-on");
  };
  toolsPanel.querySelector("#spoofBtn").onclick = () => {
    const randomIdentifier = generateRandomString(8);
    if (typeText(".play-game .el-input__inner", randomIdentifier)) {
      showNotification("Name spoofed");
    } else if (typeText(".new-tribe .el-input__inner", randomIdentifier)) {
      showNotification("Tribe name spoofed");
    } else {
      showNotification("No name input found");
    }
  };
  const v3fd5SpinBtn = toolsPanel.querySelector("#spinBtn");
  v3fd5SpinBtn.onclick = () => {
    toggleMouseSimulation();
    v3fd5SpinBtn.textContent = sysEntityTrailInterval ? "Stop Spin" : "Auto Spin";
    v3fd5SpinBtn.classList.toggle("toggle-on", !!sysEntityTrailInterval);
  };
  const turnRightKeyInput = toolsPanel.querySelector("#spinKeyInput");
  let lastPressedKey = null;
  turnRightKeyInput.addEventListener("keydown", keyboardEvent => {
    keyboardEvent.preventDefault();
    lastPressedKey = keyboardEvent.code || keyboardEvent.key;
    turnRightKeyInput.value = lastPressedKey.replace("Key", "").toUpperCase();
  });
  document.addEventListener("keydown", shortcutEvent => {
    if (lastPressedKey && shortcutEvent.code === lastPressedKey && !shortcutEvent.target.matches("input,textarea,button,select")) {
      shortcutEvent.preventDefault();
      toggleMouseSimulation();
      v3fd5SpinBtn.textContent = sysEntityTrailInterval ? "Stop Spin" : "Auto Spin";
      v3fd5SpinBtn.classList.toggle("toggle-on", !!sysEntityTrailInterval);
    }
  });
  const v8332TurnRightKeyInput = toolsPanel.querySelector("#turnLeftKeyInput");
  const v239bTurnRightKeyInput = toolsPanel.querySelector("#turnRightKeyInput");
  v8332TurnRightKeyInput.value = keyQ.toUpperCase();
  v239bTurnRightKeyInput.value = keyE.toUpperCase();
  v8332TurnRightKeyInput.addEventListener("keydown", contextMenuEvent => {
    contextMenuEvent.preventDefault();
    contextMenuEvent.stopPropagation();
    keyQ = contextMenuEvent.key;
    v8332TurnRightKeyInput.value = contextMenuEvent.key.length === 1 ? contextMenuEvent.key.toUpperCase() : contextMenuEvent.key;
  });
  v239bTurnRightKeyInput.addEventListener("keydown", dragEvent => {
    dragEvent.preventDefault();
    dragEvent.stopPropagation();
    keyE = dragEvent.key;
    v239bTurnRightKeyInput.value = dragEvent.key.length === 1 ? dragEvent.key.toUpperCase() : dragEvent.key;
  });
  makeDraggable(toolsPanel);
  return toolsPanel;
}
function createVisionPanel() {
  const visionPanel = document.createElement("div");
  visionPanel.id = "vision-panel";
  visionPanel.className = "ast-panel";
  visionPanel.style.cssText = "top:20px;right:20px;width:230px;";
  visionPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"visionMin\">−</button></div>\n      <div class=\"ast-body\" id=\"visionBody\">\n        <span class=\"ast-section-label\">Vision</span>\n        <button class=\"ast-btn patched\" id=\"thresherBtn\" disabled>Thresher Boost (Patched)</button>\n        <button class=\"ast-btn\" id=\"astraVisionBtn\">Astra-Vision</button>\n        <button class=\"ast-btn\" id=\"smallMinimapBtn\">Small Minimap</button>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">ESP</span>\n        <button class=\"ast-btn\" id=\"espBtn\">ESP</button>\n        <select class=\"ast-select\" id=\"espModeSelect\"><option value=\"players\">Players</option><option value=\"food\">Food</option></select>\n        <button class=\"ast-btn\" id=\"trackNearestBtn\">Track Nearest (F3)</button>\n        <button class=\"ast-btn\" id=\"untrackBtn\">Untrack (F4)</button>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"espColorsToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">ESP Colors</span>\n          <span id=\"espColorsArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"espColorsSection\" style=\"display:none;\">\n          <div class=\"ast-key-row\"><span>Close (&lt;500)</span><input type=\"color\" id=\"espColorClose\" value=\"#ff0000\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Medium (&lt;1500)</span><input type=\"color\" id=\"espColorMedium\" value=\"#ffff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Far (&lt;3000)</span><input type=\"color\" id=\"espColorFar\" value=\"#00ffff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Very Far</span><input type=\"color\" id=\"espColorVeryFar\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Tracked</span><input type=\"color\" id=\"espColorTracked\" value=\"#ff00ff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Close</span><input type=\"color\" id=\"espColorFoodClose\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Medium</span><input type=\"color\" id=\"espColorFoodMedium\" value=\"#88ff88\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Far</span><input type=\"color\" id=\"espColorFoodFar\" value=\"#44cc44\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n        </div>\n      </div>";
  document.body.appendChild(visionPanel);
  const espColorsSection = visionPanel.querySelector("#visionBody");
  let v3a3aIsHidden = false;
  visionPanel.querySelector("#visionMin").onclick = v5654ToggleEvent => {
    v5654ToggleEvent.stopPropagation();
    v3a3aIsHidden = !v3a3aIsHidden;
    espColorsSection.style.display = v3a3aIsHidden ? "none" : "block";
    visionPanel.querySelector("#visionMin").textContent = v3a3aIsHidden ? "+" : "−";
  };
  visionPanel.querySelector("#thresherBtn").onclick = boostEvent => {
    boostEvent.preventDefault();
    showNotification("Thresher boost has been patched");
  };
  const astraVisionBtn = visionPanel.querySelector("#astraVisionBtn");
  astraVisionBtn.onclick = () => {
    if (globalIsProcessed) {
      showNotification("Already active");
      return;
    }
    initGameHooks();
    initializeAstraVision();
    astraVisionBtn.textContent = "Astra-Vision ✓";
    astraVisionBtn.classList.add("toggle-on");
    astraVisionBtn.disabled = true;
  };
  const espBtn = visionPanel.querySelector("#smallMinimapBtn");
  espBtn.onclick = () => {
    initGameHooks();
    toggleMinimapSize();
    espBtn.textContent = boolIsToggled ? "Minimap: Small" : "Small Minimap";
    espBtn.classList.toggle("toggle-on", boolIsToggled);
  };
  const v2735EspBtn = visionPanel.querySelector("#espBtn");
  v2735EspBtn.onclick = () => {
    toggleEsp();
    v2735EspBtn.textContent = window.espEnabled ? "ESP ✓" : "ESP";
    v2735EspBtn.classList.toggle("toggle-on", window.espEnabled);
  };
  const espModeSelect = visionPanel.querySelector("#espModeSelect");
  espModeSelect.value = window.espMode || "players";
  espModeSelect.onchange = espModeEvent => {
    window.espMode = espModeEvent.target.value;
    showNotification("ESP: " + espModeEvent.target.value);
  };
  visionPanel.querySelector("#trackNearestBtn").onclick = () => trackPlayer();
  visionPanel.querySelector("#untrackBtn").onclick = () => modToggleEsp();
  const espColorsToggleBtn = visionPanel.querySelector("#espColorsToggleBtn");
  const v1386EspColorsSection = visionPanel.querySelector("#espColorsSection");
  const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
  let v1bcfIsHidden = false;
  espColorsToggleBtn.onclick = () => {
    v1bcfIsHidden = !v1bcfIsHidden;
    v1386EspColorsSection.style.display = v1bcfIsHidden ? "block" : "none";
    espColorsArrow.textContent = v1bcfIsHidden ? "▲" : "▼";
  };
  const eventInit = {
    espColorClose: "close",
    espColorMedium: "medium",
    espColorFar: "far",
    espColorVeryFar: "veryFar",
    espColorTracked: "tracked",
    espColorFoodClose: "foodClose",
    espColorFoodMedium: "foodMedium",
    espColorFoodFar: "foodFar"
  };
  Object.entries(eventInit).forEach(([elementId, colorKey]) => {
    const v28c3TargetElement = visionPanel.querySelector("#" + elementId);
    if (v28c3TargetElement) {
      v28c3TargetElement.addEventListener("input", d8c8Event => {
        window.espColors[colorKey] = d8c8Event.target.value;
      });
    }
  });
  makeDraggable(visionPanel);
  return visionPanel;
}
function createCombatPanel() {
  const combatPanel = document.createElement("div");
  combatPanel.id = "combat-panel";
  combatPanel.className = "ast-panel";
  combatPanel.style.cssText = "top:20px;left:260px;width:230px;";
  combatPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"combatMin\">−</button></div>\n      <div class=\"ast-body\" id=\"combatBody\">\n        <span class=\"ast-section-label\">Combat</span>\n        <button class=\"ast-btn\" id=\"lockBtn\">Lock Nearest</button>\n        <div class=\"ast-key-row\"><span>Lock Key</span><input class=\"ast-key-capture\" id=\"lockKeyInput\" type=\"text\" value=\"T\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tracking</span>\n        <div class=\"ast-key-row\" style=\"margin-top:4px;\">\n          <span>Trail Color</span>\n          <input type=\"color\" id=\"trailColorPicker\" value=\"#ff9600\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;background:var(--bg2,#242424);cursor:pointer;padding:0;\">\n        </div>\n        <div class=\"ast-key-row\"><span>Trace Key (re-targets)</span><input class=\"ast-key-capture\" id=\"traceKeyInput\" type=\"text\" value=\"H\" readonly></div>\n      </div>";
  document.body.appendChild(combatPanel);
  const combatBody = combatPanel.querySelector("#combatBody");
  let isCombatMinimized = false;
  combatPanel.querySelector("#combatMin").onclick = v5e01ToggleEvent => {
    v5e01ToggleEvent.stopPropagation();
    isCombatMinimized = !isCombatMinimized;
    combatBody.style.display = isCombatMinimized ? "none" : "block";
    combatPanel.querySelector("#combatMin").textContent = isCombatMinimized ? "+" : "−";
  };
  const v5301LockButton = combatPanel.querySelector("#lockBtn");
  v5301LockButton.onclick = () => toggleLock();
  const lockKeyInput = combatPanel.querySelector("#lockKeyInput");
  lockKeyInput.value = window.lockKey.toUpperCase();
  lockKeyInput.addEventListener("keydown", lockEvent => {
    lockEvent.preventDefault();
    lockEvent.stopPropagation();
    window.lockKey = lockEvent.key;
    lockKeyInput.value = lockEvent.key.length === 1 ? lockEvent.key.toUpperCase() : lockEvent.key;
  });
  const trailColorPicker = combatPanel.querySelector("#trailColorPicker");
  trailColorPicker.addEventListener("input", colorChangeEvent => {
    const colorValue = colorChangeEvent.target.value;
    window.entityTrailColor = {
      r: parseInt(colorValue.slice(1, 3), 16),
      g: parseInt(colorValue.slice(3, 5), 16),
      b: parseInt(colorValue.slice(5, 7), 16)
    };
  });
  const traceKeyInput = combatPanel.querySelector("#traceKeyInput");
  traceKeyInput.value = window.entityTraceKey.toUpperCase();
  traceKeyInput.addEventListener("keydown", traceEvent => {
    traceEvent.preventDefault();
    traceEvent.stopPropagation();
    window.entityTraceKey = traceEvent.key.toLowerCase();
    traceKeyInput.value = traceEvent.key.length === 1 ? traceEvent.key.toUpperCase() : traceEvent.key;
  });
  makeDraggable(combatPanel);
  return combatPanel;
}
function createAutomationPanel() {
  const automationPanel = document.createElement("div");
  automationPanel.id = "automation-panel";
  automationPanel.className = "ast-panel";
  automationPanel.style.cssText = "bottom:20px;left:260px;width:230px;";
  automationPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"autoMin\">−</button></div>\n      <div class=\"ast-body\" id=\"autoBody\">\n        <span class=\"ast-section-label\">Automation</span>\n        <button class=\"ast-btn\" id=\"autoDodgeBtn\">Auto Dodge</button>\n        <button class=\"ast-btn\" id=\"autoFarmBtn\">Auto Farm (F5)</button>\n        <select class=\"ast-select\" id=\"farmModeSelect\" style=\"margin-top:4px;\">\n          <option value=\"nearest\">Nearest Food</option>\n          <option value=\"cluster\">Food Clusters</option>\n          <option value=\"patrol\">Patrol Route</option>\n        </select>\n        <div class=\"ast-toggle-row\"><span>Boost</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmBoostToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Auto Evolve</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmEvolveToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Avoid Players</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmAvoidToggle\" checked><span class=\"slider\"></span></div></div>\n      </div>";
  document.body.appendChild(automationPanel);
  const automationBody = automationPanel.querySelector("#autoBody");
  let isAutoMinimized = false;
  automationPanel.querySelector("#autoMin").onclick = menuToggleEvent => {
    menuToggleEvent.stopPropagation();
    isAutoMinimized = !isAutoMinimized;
    automationBody.style.display = isAutoMinimized ? "none" : "block";
    automationPanel.querySelector("#autoMin").textContent = isAutoMinimized ? "+" : "−";
  };
  const autoDodgeButton = automationPanel.querySelector("#autoDodgeBtn");
  autoDodgeButton.onclick = () => {
    if (window.autoDodgeEnabled) {
      toggleEsp();
      autoDodgeButton.textContent = "Auto Dodge";
      autoDodgeButton.classList.remove("toggle-on");
    } else {
      enableAutoDodge();
      autoDodgeButton.textContent = "Dodging ✓";
      autoDodgeButton.classList.add("toggle-on");
    }
  };
  const autoFarmButton = automationPanel.querySelector("#autoFarmBtn");
  autoFarmButton.id = "autoFarmBtn";
  const farmModeSelect = automationPanel.querySelector("#farmModeSelect");
  autoFarmButton.onclick = () => {
    if (window.autoFarmActive) {
      stopAutoFarm();
      autoFarmButton.textContent = "Auto Farm (F5)";
      autoFarmButton.classList.remove("toggle-on");
    } else {
      startAutoFarm(farmModeSelect.value);
      autoFarmButton.textContent = "Stop Farm (F5)";
      autoFarmButton.classList.add("toggle-on");
    }
  };
  farmModeSelect.onchange = farmModeChangeEvent => {
    if (window.autoFarmActive) {
      window.autoFarmMode = farmModeChangeEvent.target.value;
      if (farmModeChangeEvent.target.value === "patrol") {
        setupPatrolPoints();
      }
      showNotification("Farm: " + farmModeChangeEvent.target.value);
    }
  };
  const farmAvoidToggle = automationPanel.querySelector("#farmBoostToggle");
  const fa20FarmAvoidToggle = automationPanel.querySelector("#farmEvolveToggle");
  const v3419FarmAvoidToggle = automationPanel.querySelector("#farmAvoidToggle");
  farmAvoidToggle.checked = window.autoFarmBoost;
  fa20FarmAvoidToggle.checked = window.autoFarmEvolve;
  v3419FarmAvoidToggle.checked = window.autoFarmAvoidPlayers;
  const farmBoostLabel = farmAvoidToggle.nextElementSibling;
  farmBoostLabel.addEventListener("click", farmOptionEvent1 => {
    farmOptionEvent1.stopPropagation();
    farmAvoidToggle.checked = !farmAvoidToggle.checked;
    window.autoFarmBoost = farmAvoidToggle.checked;
    showNotification(farmAvoidToggle.checked ? "Farm boost ON" : "Farm boost OFF");
  });
  const farmEvolveLabel = fa20FarmAvoidToggle.nextElementSibling;
  farmEvolveLabel.addEventListener("click", farmOptionEvent2 => {
    farmOptionEvent2.stopPropagation();
    fa20FarmAvoidToggle.checked = !fa20FarmAvoidToggle.checked;
    window.autoFarmEvolve = fa20FarmAvoidToggle.checked;
    showNotification(fa20FarmAvoidToggle.checked ? "Auto evolve ON" : "Auto evolve OFF");
  });
  const farmAvoidLabel = v3419FarmAvoidToggle.nextElementSibling;
  farmAvoidLabel.addEventListener("click", farmOptionEvent3 => {
    farmOptionEvent3.stopPropagation();
    v3419FarmAvoidToggle.checked = !v3419FarmAvoidToggle.checked;
    window.autoFarmAvoidPlayers = v3419FarmAvoidToggle.checked;
    showNotification(v3419FarmAvoidToggle.checked ? "Avoid players ON" : "Avoid players OFF");
  });
  makeDraggable(automationPanel);
  return automationPanel;
}
function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settings-panel";
  settingsPanel.className = "ast-panel";
  settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
  settingsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Settings</span><button class=\"ast-header-min\" id=\"settingsMin\">−</button></div>\n      <div class=\"ast-body\" id=\"settingsBody\">\n        <div class=\"ast-key-row\"><span>Toggle UI</span><input class=\"ast-key-capture\" id=\"toggleKeyInput\" type=\"text\" value=\"SHIFT\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Background</span>\n        <div class=\"ast-row\"><input class=\"ast-input\" type=\"text\" id=\"bgUrl\" placeholder=\"Image URL...\" style=\"flex:1;\"><button class=\"ast-btn\" id=\"applyBg\" style=\"width:auto;padding:6px 10px;margin:0;\">Set</button></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Theme</span>\n        <select class=\"ast-select\" id=\"themeSelect\">\n          <option value=\"grey\">Grey</option><option value=\"blue\">Blue</option><option value=\"red\">Red</option>\n          <option value=\"green\">Green</option><option value=\"pink\">Pink</option><option value=\"starwars\">Star Wars</option>\n          <option value=\"kfc\">KFC</option><option value=\"halloween\">Halloween 🔒</option>\n        </select>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"customThemeToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">Create Theme</span>\n          <span id=\"customThemeArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"customThemeSection\" style=\"display:none;padding-top:4px;\">\n          <input class=\"ast-input\" type=\"text\" id=\"customThemeName\" placeholder=\"Theme name...\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n<div class=\"ast-key-row\"><span>Accent</span><input type=\"color\" id=\"ctAcc\" value=\"#888888\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Background</span><input type=\"color\" id=\"ctBg\" value=\"#1a1a1a\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Panel</span><input type=\"color\" id=\"ctPanel\" value=\"#242424\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<button class=\"ast-btn\" id=\"saveCustomTheme\" style=\"margin-top:4px;\">Save Theme</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"myThemesToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">My Themes</span>\n          <span id=\"myThemesArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"myThemesSection\" style=\"display:none;padding-top:4px;\">\n          <div id=\"customThemeList\"></div>\n          <div id=\"noThemesMsg\" style=\"font-size:11px;color:#555;text-align:center;padding:8px 0;\">No custom themes yet</div>\n        </div>\n      </div>";
  document.body.appendChild(settingsPanel);
  const myThemesSection = settingsPanel.querySelector("#settingsBody");
  let v2bffIsHidden = false;
  settingsPanel.querySelector("#settingsMin").onclick = v253cEvent => {
    v253cEvent.stopPropagation();
    v2bffIsHidden = !v2bffIsHidden;
    myThemesSection.style.display = v2bffIsHidden ? "none" : "block";
    settingsPanel.querySelector("#settingsMin").textContent = v2bffIsHidden ? "+" : "−";
  };
  const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
  toggleKeyInput.value = activeKey.toUpperCase();
  toggleKeyInput.addEventListener("keydown", v32f1KeyboardEvent => {
    v32f1KeyboardEvent.preventDefault();
    activeKey = v32f1KeyboardEvent.key;
    toggleKeyInput.value = v32f1KeyboardEvent.key.length === 1 ? v32f1KeyboardEvent.key.toUpperCase() : v32f1KeyboardEvent.key;
  });
  const bgUrlInput = settingsPanel.querySelector("#bgUrl");
  bgUrlInput.value = localStorage.getItem("bgUrl") || "";
  settingsPanel.querySelector("#applyBg").onclick = () => {
    const bgUrl = bgUrlInput.value.trim();
    if (!bgUrl) {
      showNotification("Enter a URL");
      return;
    }
    localStorage.setItem("bgUrl", bgUrl);
    initBackground();
    showNotification("Background applied");
  };
  const themeSelect = settingsPanel.querySelector("#themeSelect");
  const v17a7Angle = localStorage.getItem("theme") || "grey";
  const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
  const presetThemes = ["grey", "blue", "red", "green", "pink", "starwars", "kfc", "halloween"];
  themeSelect.value = presetThemes.includes(v17a7Angle) || customThemes[v17a7Angle] ? v17a7Angle : "grey";
  themeSelect.onchange = themeChangeEvent => {
    const v48deMyY = themeChangeEvent.target.value;
    if (v48deMyY === "halloween") {
      showHalloweenModal(isHalloween => {
        if (isHalloween) {
          applyTheme("halloween");
        } else {
          themeChangeEvent.target.value = localStorage.getItem("theme") || "grey";
        }
      });
    } else {
      applyTheme(v48deMyY);
      showNotification("Theme: " + v48deMyY);
    }
  };
  const renderCustomThemes = () => {
    const customThemeList = settingsPanel.querySelector("#customThemeList");
    const noThemesMessage = settingsPanel.querySelector("#noThemesMsg");
    const v4d42CustomThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
    const customThemeKeys = Object.keys(v4d42CustomThemes);
    customThemeList.innerHTML = "";
    noThemesMessage.style.display = customThemeKeys.length === 0 ? "block" : "none";
    customThemeKeys.forEach(v1928MyY => {
      const themeElement = document.createElement("div");
      themeElement.style.cssText = "display:flex;gap:4px;margin-bottom:3px;";
      const isThemeActive = localStorage.getItem("theme") === v1928MyY;
      themeElement.innerHTML = "\n          <button class=\"ast-btn" + (isThemeActive ? " toggle-on" : "") + "\" style=\"flex:1;margin:0;\">" + v1928MyY + "</button>\n          <button class=\"ast-btn\" style=\"width:32px;margin:0;text-align:center;color:#f44336;\">✕</button>";
      themeElement.querySelectorAll("button")[0].onclick = () => {
        applyTheme(v1928MyY);
        showNotification("Theme: " + v1928MyY);
        renderCustomThemes();
      };
      themeElement.querySelectorAll("button")[1].onclick = () => {
        const v2f0cCustomThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
        delete v2f0cCustomThemes[v1928MyY];
        localStorage.setItem("customThemes", JSON.stringify(v2f0cCustomThemes));
        if (localStorage.getItem("theme") === v1928MyY) {
          applyTheme("grey");
          themeSelect.value = "grey";
          showNotification("Theme reset to Grey");
        } else {
          showNotification("Deleted: " + v1928MyY);
        }
        renderCustomThemes();
      };
      customThemeList.appendChild(themeElement);
    });
  };
  renderCustomThemes();
  settingsPanel.querySelector("#saveCustomTheme").onclick = () => {
    const customThemeName = settingsPanel.querySelector("#customThemeName").value.trim();
    if (!customThemeName) {
      showNotification("Enter a theme name");
      return;
    }
    const availableThemes = ["grey", "blue", "red", "green", "pink", "starwars", "kfc", "halloween"];
    if (availableThemes.includes(customThemeName.toLowerCase())) {
      showNotification("Cannot use built-in theme name");
      return;
    }
    const accountValue = settingsPanel.querySelector("#ctAcc").value;
    const themeBgColor = settingsPanel.querySelector("#ctBg").value;
    const themePanelColor = settingsPanel.querySelector("#ctPanel").value;
    const v2cacRed = parseInt(accountValue.slice(1, 3), 16);
    const v11cfGreen = parseInt(accountValue.slice(3, 5), 16);
    const v3783Blue = parseInt(accountValue.slice(5, 7), 16);
    const adjustColor = hexColor => {
      const redComponent = parseInt(hexColor.slice(1, 3), 16) + 10;
      const greenComponent = parseInt(hexColor.slice(3, 5), 16) + 10;
      const blueComponent = parseInt(hexColor.slice(5, 7), 16) + 10;
      return "#" + [redComponent, greenComponent, blueComponent].map(v5bd4ColorValue => Math.min(255, v5bd4ColorValue).toString(16).padStart(2, "0")).join("");
    };
    const themeSettings = {
      acc: accountValue,
      accH: adjustColor(accountValue),
      accRGB: v2cacRed + "," + v11cfGreen + "," + v3783Blue,
      text: "#e0e0e0",
      textSec: "#888",
      bg1: themeBgColor,
      bg2: themePanelColor,
      bg3: adjustColor(themePanelColor),
      border: "#333",
      hover: adjustColor(themePanelColor)
    };
    const v551fCustomThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
    v551fCustomThemes[customThemeName] = themeSettings;
    localStorage.setItem("customThemes", JSON.stringify(v551fCustomThemes));
    applyTheme(customThemeName);
    settingsPanel.querySelector("#customThemeName").value = "";
    renderCustomThemes();
    showNotification("Theme saved: " + customThemeName);
  };
  const myThemesToggleBtn = settingsPanel.querySelector("#customThemeToggleBtn");
  const cf1dMyThemesSection = settingsPanel.querySelector("#customThemeSection");
  const myThemesArrow = settingsPanel.querySelector("#customThemeArrow");
  let v781fIsHidden = false;
  myThemesToggleBtn.onclick = () => {
    v781fIsHidden = !v781fIsHidden;
    cf1dMyThemesSection.style.display = v781fIsHidden ? "block" : "none";
    myThemesArrow.textContent = v781fIsHidden ? "▲" : "▼";
  };
  const v4b6aMyThemesToggleBtn = settingsPanel.querySelector("#myThemesToggleBtn");
  const c0ccMyThemesSection = settingsPanel.querySelector("#myThemesSection");
  const v465cMyThemesArrow = settingsPanel.querySelector("#myThemesArrow");
  let v4198IsHidden = false;
  v4b6aMyThemesToggleBtn.onclick = () => {
    v4198IsHidden = !v4198IsHidden;
    c0ccMyThemesSection.style.display = v4198IsHidden ? "block" : "none";
    v465cMyThemesArrow.textContent = v4198IsHidden ? "▲" : "▼";
    if (v4198IsHidden) {
      renderCustomThemes();
    }
  };
  makeDraggable(settingsPanel);
  return settingsPanel;
}
function createUpdateHistoryPanel() {
  const updatePanel = document.createElement("div");
  updatePanel.id = "update-history";
  updatePanel.className = "ast-panel";
  updatePanel.style.cssText = "bottom:20px;left:20px;width:230px;max-height:280px;";
  updatePanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Updates</span><button class=\"ast-header-min\" id=\"updateMin\">−</button></div>\n      <div class=\"ast-body\" id=\"updateBody\" style=\"overflow-y:auto;max-height:220px;\">\n        <ul class=\"ast-update-list\">\n         <li><strong>v1.8</strong> — Fixed Astra-Vision (Shadows not being Removed), added Custom Themes Feature, fixed enable/disable for sliders, fixed ESP not working properly/gltiched.</li>\n          <li><strong>v1.7</strong> — New Features and Organization.</li>\n        </ul>\n      </div>";
  document.body.appendChild(updatePanel);
  const updateBody = updatePanel.querySelector("#updateBody");
  let isMinimized = false;
  updatePanel.querySelector("#updateMin").onclick = da88Event => {
    da88Event.stopPropagation();
    isMinimized = !isMinimized;
    updateBody.style.display = isMinimized ? "none" : "block";
    updatePanel.querySelector("#updateMin").textContent = isMinimized ? "+" : "−";
  };
  makeDraggable(updatePanel);
  return updatePanel;
}
let activeKey = "Shift";
function togglePanelsVisibility() {
  const panelIds = ["deep-tools-panel", "vision-panel", "combat-panel", "automation-panel", "update-history", "settings-panel"];
  const Panel = document.getElementById("deep-tools-panel");
  if (!Panel) {
    return;
  }
  const isMainPanelVisible = Panel.style.display !== "none";
  panelIds.forEach(v7986ElementId => {
    const v123eTargetElement = document.getElementById(v7986ElementId);
    if (v123eTargetElement) {
      v123eTargetElement.style.display = isMainPanelVisible ? "none" : "block";
    }
  });
}
let modIsProcessed = false;
function initializeApp() {
  if (modIsProcessed) {
    return;
  }
  modIsProcessed = true;
  setTimeout(() => {
    injectStyles();
    applyTheme(localStorage.getItem("theme") || "grey");
    createToolsPanel();
    createVisionPanel();
    createCombatPanel();
    createAutomationPanel();
    createSettingsPanel();
    createUpdateHistoryPanel();
    initBackground();
    initAdBlocker();
    initRadarDrag();
    renderEspLoop();
    renderOverlay();
    isProcessed = true;
    updateLockOnTarget();
    mainIsProcessed = true;
    autoDodgeLoop();
  }, 1000);
}
document.addEventListener("keydown", v3706Event => {
  if (v3706Event.target.matches("input,textarea,select,[contenteditable]")) {
    return;
  }
  if (v3706Event.repeat) {
    return;
  }
  if (v3706Event.key.toLowerCase() === keyQ.toLowerCase()) {
    v3706Event.preventDefault();
    v3706Event.stopPropagation();
    moveMouseSide("left");
  }
  if (v3706Event.key.toLowerCase() === keyE.toLowerCase()) {
    v3706Event.preventDefault();
    v3706Event.stopPropagation();
    moveMouseSide("right");
  }
}, true);
window.lockEnabled = false;
window.lockTargetId = null;
window.lockKey = "t";
document.addEventListener("keydown", v59cfEvent => {
  if (v59cfEvent.target.matches("input,textarea,select,[contenteditable]")) {
    return;
  }
  if (v59cfEvent.repeat) {
    return;
  }
  if (v59cfEvent.key.toLowerCase() === window.lockKey.toLowerCase()) {
    v59cfEvent.preventDefault();
    toggleLock();
  }
}, true);
window.entityTrailColor = {
  r: 255,
  g: 150,
  b: 0
};
window.entityTrailEnabled = false;
window.entityTrailTargetId = null;
window.entityTrailHistory = [];
window.entityTrailMaxLength = 200;
window.entityTrailRecordInterval = 100;
window.entityTraceKey = "h";
document.addEventListener("keydown", v5472Event => {
  if (v5472Event.target.matches("input,textarea,select,[contenteditable]")) {
    return;
  }
  if (v5472Event.repeat) {
    return;
  }
  const entityTraceKey = window.entityTraceKey.toLowerCase();
  const entityKey = v5472Event.key.toLowerCase();
  const entityCode = v5472Event.code.toLowerCase();
  if (entityKey === entityTraceKey || entityCode === entityTraceKey || entityCode === "key" + entityTraceKey) {
    v5472Event.preventDefault();
    toggleEntityTrail();
  }
}, true);
window.espEnabled = false;
window.espColors = {
  close: "#ff0000",
  medium: "#ffff00",
  far: "#00ffff",
  veryFar: "#00ff00",
  tracked: "#ff00ff",
  foodClose: "#00ff00",
  foodMedium: "#88ff88",
  foodFar: "#44cc44"
};
window.espTrackedEntityId = null;
window.espMode = "players";
document.addEventListener("keydown", v6037Event => {
  if (v6037Event.target.matches("input,textarea,select")) {
    return;
  }
  if (v6037Event.key === "F3") {
    v6037Event.preventDefault();
    trackPlayer();
  }
  if (v6037Event.key === "F4") {
    v6037Event.preventDefault();
    modToggleEsp();
  }
});
window.autoDodgeEnabled = false;
window.autoFarmActive = false;
window.autoFarmMode = "nearest";
window.autoFarmRange = 3000;
window.autoFarmBoost = true;
window.autoFarmEvolve = true;
window.autoFarmAvoidPlayers = true;
window.autoFarmAvoidDistance = 800;
window.autoFarmStats = {
  collected: 0,
  startTime: 0
};
window.autoFarmPatrolPoints = [];
window.autoFarmPatrolIndex = 0;
window.autoFarmCurrentTarget = null;
window.autoFarmTargetStartTime = 0;
window.autoFarmSkipIds = new Set();
window.autoFarmSkipClearTime = 0;
window.autoFarmSkipAreas = [];
document.addEventListener("keydown", v4dafEvent => {
  if (v4dafEvent.target.matches("input,textarea,select")) {
    return;
  }
  if (v4dafEvent.key === "F5") {
    v4dafEvent.preventDefault();
    if (window.autoFarmActive) {
      stopAutoFarm();
      const farmBtn = document.getElementById("autoFarmBtn");
      if (farmBtn) {
        farmBtn.textContent = "Auto Farm";
        farmBtn.classList.remove("toggle-on");
      }
    } else {
      const v486cFarmModeSelect = document.getElementById("farmModeSelect");
      startAutoFarm(v486cFarmModeSelect ? v486cFarmModeSelect.value : "nearest");
      const v3dd9AutoFarmButton = document.getElementById("autoFarmBtn");
      if (v3dd9AutoFarmButton) {
        v3dd9AutoFarmButton.textContent = "Stop Farm";
        v3dd9AutoFarmButton.classList.add("toggle-on");
      }
    }
  }
});
document.addEventListener("keydown", v1010KeyboardEvent => {
  if (v1010KeyboardEvent.key === activeKey && !v1010KeyboardEvent.repeat && !v1010KeyboardEvent.target.matches("input,textarea,button,select")) {
    v1010KeyboardEvent.preventDefault();
    togglePanelsVisibility();
  }
});
if (document.body) {
  initializeApp();
} else {
  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      bodyObserver.disconnect();
      initializeApp();
    }
  });
  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
window.addEventListener("load", () => {
  setTimeout(() => {
    initGameHooks();
    initBackground();
  }, 1000);
});