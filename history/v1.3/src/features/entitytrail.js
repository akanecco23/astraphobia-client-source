import { getAllPropertyNames } from "../utils.js";
import { stateMap, wrapWithProxy, state, coreSharedState } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { initControlOverlay } from "../ui/panels.js";

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
    stateMap.set(propertyInstance, targetObject[propertyKey]);
    targetObject[propertyKey] = propertyInstance;
  };
  createPropertyProxy(Function.prototype, "toString", {
    apply(thisContext, propertyKey_2, thisArg) {
      return propertyCache.apply(
        thisContext,
        stateMap.get(propertyKey_2) || propertyKey_2,
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
          coreSharedState.player = functionContext2[0];
          coreSharedState.game = functionContext2[0].game;
          const allKeys = getAllPropertyNames(coreSharedState.player);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(
              coreSharedState.player.__proto__.__proto__,
            )
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (methodName) =>
                  coreSharedState.player[methodName] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof coreSharedState.player[shadowKey]?.shadow !==
                "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof coreSharedState.player[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || state.entityManager;
          state.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            coreSharedState.player[state.entityManager],
          );
          const animalsUpdateInterval = setInterval(() => {
            state.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityKey) =>
                    typeof coreSharedState.player?.[state.entityManager]?.[
                      entityKey
                    ]?.[0] !== "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(coreSharedState.game).find(
              (packetSenderKey) =>
                typeof coreSharedState.game[packetSenderKey]?.sendBytePacket !==
                "undefined",
            ) || state.socketManager;
          try {
            coreSharedState.appState = document
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
              if (!coreSharedState.player?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = coreSharedState.player.myAnimals[0];
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

export { initHooks };
