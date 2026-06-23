import { getGameCanvas, getAllPropertyNames } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import {
  angles,
  radius,
  stateMap,
  wrapWithProxy,
  state,
  initMod,
  coreSharedState,
} from "../core.js";

function startAntiAfk() {
  if (coreSharedState.animationInterval) {
    return;
  }
  const gameCanvas = getGameCanvas();
  if (!gameCanvas) {
    showNotification("Game canvas not found!");
    return;
  }
  coreSharedState.animationInterval = setInterval(() => {
    const angleDegrees = angles[coreSharedState.angleIndex];
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
      (coreSharedState.angleIndex + 1) % angles.length;
  }, 15);
}
const setupAntiDetection = () => {
  const storage = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    storage[propertyKey] = Reflect[propertyKey];
  }
  const ProxyClass = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapWithProxy = (dataStore, storeIndex, storeValue) => {
    const processedValue = new ProxyClass(dataStore[storeIndex], storeValue);
    stateMap.set(processedValue, dataStore[storeIndex]);
    dataStore[storeIndex] = processedValue;
  };
  wrapWithProxy(Function.prototype, "toString", {
    apply(context, functionKey, applyArgs) {
      return storage.apply(
        context,
        stateMap.get(functionKey) || functionKey,
        applyArgs,
      );
    },
  });
  wrapWithProxy(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = storage.construct(constructor, constructorArgs);
      return instance;
    },
  });
  wrapWithProxy(ProxyClass, "revocable", {
    apply(applyContext, applyTarget, applyArgs2) {
      const applyResult = storage.apply(applyContext, applyTarget, applyArgs2);
      return applyResult;
    },
  });
  let lastTimestamp = 0;
  wrapWithProxy(Function.prototype, "bind", {
    apply(applyContext2, applyTarget2, applyArgs3) {
      try {
        try {
          if (
            lookupGetter.call(applyArgs3[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return storage.apply(applyContext2, applyTarget2, applyArgs3);
          }
        } catch {}
        if (applyArgs3[0] && applyArgs3[0].aboveBgPlatformsContainer != null) {
          coreSharedState.userData = applyArgs3[0];
          coreSharedState.gameInstance = applyArgs3[0].game;
          const allKeys = getAllPropertyNames(coreSharedState.userData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(
              coreSharedState.userData.__proto__.__proto__,
            )
              .filter((targetVarName) => targetVarName.startsWith("_0x"))
              .find(
                (methodName) =>
                  coreSharedState.userData[methodName] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowEntityKey) =>
                typeof coreSharedState.userData[shadowEntityKey]?.shadow !==
                "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof coreSharedState.userData[entitiesListKey]
                  ?.entitiesList !== "undefined",
            ) || state.entityManager;
          state.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            coreSharedState.userData[state.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            state.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof coreSharedState.userData?.[state.entityManager]?.[
                      entityKey
                    ]?.[0] !== "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(coreSharedState.gameInstance).find(
              (networkServiceKey) =>
                typeof coreSharedState.gameInstance[networkServiceKey]
                  ?.sendBytePacket !== "undefined",
            ) || state.socketManager;
          try {
            coreSharedState.globalState = document
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
              if (!coreSharedState.userData?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = coreSharedState.userData.myAnimals[0];
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
              clearInterval(animalsCheckInterval);
            } catch {}
          }, 200);
          if (lastTimestamp < Date.now() - 3000) {
            showNotification("✅ Astraphobia client loaded in game");
            lastTimestamp = Date.now();
          }
          initMod();
        }
      } catch {}
      return storage.apply(applyContext2, applyTarget2, applyArgs3);
    },
  });
};

export { startAntiAfk, setupAntiDetection };
