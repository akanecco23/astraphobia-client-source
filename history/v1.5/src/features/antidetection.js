import { getGameCanvas, getAllPropertyNames } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import {
  angleSteps,
  radius,
  stateMap,
  wrapPropertyWithProxy,
  state,
  coreSharedState,
} from "../core.js";
import { initControlOverlay } from "../ui/panels.js";

function startAntiAfk() {
  if (coreSharedState.rotationInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  coreSharedState.rotationInterval = setInterval(() => {
    const angleDegrees = angleSteps[coreSharedState.angleIndex];
    const angleRadians = (Math.PI * 2 * angleDegrees) / 360;
    const offsetX = Math.round(radius * Math.sin(angleRadians));
    const offsetY = Math.round(radius * Math.cos(angleRadians));
    gameCanvas.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth / 2 + offsetX,
        clientY: window.innerHeight / 2 + offsetY,
        bubbles: true,
      }),
    );
    coreSharedState.angleIndex =
      (coreSharedState.angleIndex + 1) % angleSteps.length;
  }, 15);
}
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
          coreSharedState.playerData = extraArg3[0];
          coreSharedState.gameInstance = extraArg3[0].game;
          const allKeys = getAllPropertyNames(coreSharedState.playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(
              coreSharedState.playerData.__proto__.__proto__,
            )
              .filter((obfuscatedPropName) =>
                obfuscatedPropName.startsWith("_0x"),
              )
              .find(
                (methodName) =>
                  coreSharedState.playerData[methodName] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowEntityKey) =>
                typeof coreSharedState.playerData[shadowEntityKey]?.shadow !==
                "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof coreSharedState.playerData[entitiesListKey]
                  ?.entitiesList !== "undefined",
            ) || state.entityManager;
          state.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            coreSharedState.playerData[state.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            state.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityName) =>
                    typeof coreSharedState.playerData?.[state.entityManager]?.[
                      entityName
                    ]?.[0] !== "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(coreSharedState.gameInstance).find(
              (networkClientKey) =>
                typeof coreSharedState.gameInstance[networkClientKey]
                  ?.sendBytePacket !== "undefined",
            ) || state.socketManager;
          try {
            coreSharedState.appState = document
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
              if (!coreSharedState.playerData?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = coreSharedState.playerData.myAnimals[0];
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

export { startAntiAfk, initializeAntiTamper };
