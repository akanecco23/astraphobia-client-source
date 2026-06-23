import {
  privateStateMap,
  wrapWithProxy,
  state,
  disableZoomClamp,
  initGameCheats,
  coreSharedState,
} from "../core.js";
import { getAllPropertyNames } from "../utils.js";
import { showToast } from "../ui/interaction.js";

const initHooks = () => {
  const propertyCache = {};
  for (const propertyName of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propertyName] = Reflect[propertyName];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapWithProxy = (state, key, value) => {
    const wrappedValue = new ProxyConstructor(state[key], value);
    privateStateMap.set(wrappedValue, state[key]);
    state[key] = wrappedValue;
  };
  wrapWithProxy(Function.prototype, "toString", {
    apply(thisContext, key_2, context) {
      return propertyCache.apply(
        thisContext,
        privateStateMap.get(key_2) || key_2,
        context,
      );
    },
  });
  wrapWithProxy(window, "Proxy", {
    construct(constructor, constructorArgs) {
      const instance = propertyCache.construct(constructor, constructorArgs);
      return instance;
    },
  });
  wrapWithProxy(ProxyConstructor, "revocable", {
    apply(targetFunction, functionArgs, functionContext) {
      const functionResult = propertyCache.apply(
        targetFunction,
        functionArgs,
        functionContext,
      );
      return functionResult;
    },
  });
  let lastExecutionTime = 0;
  wrapWithProxy(Function.prototype, "bind", {
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
          coreSharedState.playerData = functionContext2[0];
          coreSharedState.gameInstance = functionContext2[0].game;
          const allKeys = getAllPropertyNames(coreSharedState.playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedKey) =>
            obfuscatedKey.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(
              coreSharedState.playerData.__proto__.__proto__,
            )
              .filter((obfuscatedName) => obfuscatedName.startsWith("_0x"))
              .find(
                (functionKey) =>
                  coreSharedState.playerData[functionKey] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedKeys.find(
              (shadowObjectKey) =>
                typeof coreSharedState.playerData[shadowObjectKey]?.shadow !==
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
                  (entityType) =>
                    typeof coreSharedState.playerData?.[state.entityManager]?.[
                      entityType
                    ]?.[0] !== "undefined",
                ) || state.entityManagerProps.animalsList;
            if (typeof state.entityManagerProps.animalsList !== "undefined") {
              clearInterval(animalsUpdateInterval);
            }
          }, 1000);
          state.socketManager =
            getAllPropertyNames(coreSharedState.gameInstance).find(
              (packetSenderKey) =>
                typeof coreSharedState.gameInstance[packetSenderKey]
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
              if (!coreSharedState.playerData?.myAnimals?.[0]) {
                return;
              }
              const myAnimal = coreSharedState.playerData.myAnimals[0];
              if (myAnimal.fadingTrail) {
                const fadingTrailProto = Object.getPrototypeOf(
                  myAnimal.fadingTrail,
                );
                wrapWithProxy(fadingTrailProto, "enable", {
                  apply() {},
                });
              }
              if (myAnimal.bubblesEmitter) {
                const bubblesEmitterProto = Object.getPrototypeOf(
                  myAnimal.bubblesEmitter,
                );
                Object.defineProperty(bubblesEmitterProto, "emit", {
                  set: () => {},
                });
              }
              clearInterval(animalsCheckInterval);
            } catch {}
          }, 200);
          if (lastExecutionTime < Date.now() - 3000) {
            showToast("✅ Astraphobia client loaded in game");
            lastExecutionTime = Date.now();
          }
          disableZoomClamp();
          initGameCheats();
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
