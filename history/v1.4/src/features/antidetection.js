import { getAllPropertyNames } from "../utils.js";
import { stateMap, wrapPropertyWithProxy, stateCache, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";
import { initControlOverlay } from "../ui/panels.js";

const setupProxyHooks = () => {
  const propertyCache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    propertyCache[propertyKey] = Reflect[propertyKey];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapWithProxy = (contextMap, contextKey, contextValue) => {
    const contextInstance = new ProxyConstructor(
      contextMap[contextKey],
      contextValue,
    );
    stateMap.set(contextInstance, contextMap[contextKey]);
    contextMap[contextKey] = contextInstance;
  };
  wrapWithProxy(Function.prototype, "toString", {
    apply(thisArg, propertyKey, applyParams) {
      return propertyCache.apply(
        thisArg,
        stateMap.get(propertyKey) || propertyKey,
        applyParams,
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
    apply(context, args, options) {
      const result = propertyCache.apply(context, args, options);
      return result;
    },
  });
  let lastExecutionTime = 0;
  wrapWithProxy(Function.prototype, "bind", {
    apply(callContext, callArgs, callOptions) {
      try {
        try {
          if (
            lookupGetter.call(callOptions[0], "aboveBgPlatformsContainer") !=
            null
          ) {
            return propertyCache.apply(callContext, callArgs, callOptions);
          }
        } catch {}
        if (
          callOptions[0] &&
          callOptions[0].aboveBgPlatformsContainer != null
        ) {
          state.playerData = callOptions[0];
          state.gameInstance = callOptions[0].game;
          const allKeys = getAllPropertyNames(state.playerData);
          const obfuscatedKeys = allKeys.filter((obfuscatedVarName) =>
            obfuscatedVarName.startsWith("_0x"),
          );
          stateCache.setFlash =
            Object.getOwnPropertyNames(state.playerData.__proto__.__proto__)
              .filter((obfuscatedPropName) =>
                obfuscatedPropName.startsWith("_0x"),
              )
              .find(
                (functionKey) =>
                  state.playerData[functionKey] instanceof Function,
              ) || stateCache.setFlash;
          stateCache.terrainManager =
            obfuscatedKeys.find(
              (shadowObjectKey) =>
                typeof state.playerData[shadowObjectKey]?.shadow !==
                "undefined",
            ) || stateCache.terrainManager;
          stateCache.entityManager =
            obfuscatedKeys.find(
              (entitiesListKey) =>
                typeof state.playerData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || stateCache.entityManager;
          stateCache.entityManagerProps = {};
          const entityManagerKeys = getAllPropertyNames(
            state.playerData[stateCache.entityManager],
          );
          const animalsListInterval = setInterval(() => {
            stateCache.entityManagerProps.animalsList =
              entityManagerKeys
                .filter((variableName) => variableName.startsWith("_0x"))
                .find(
                  (entityName) =>
                    typeof state.playerData?.[stateCache.entityManager]?.[
                      entityName
                    ]?.[0] !== "undefined",
                ) || stateCache.entityManagerProps.animalsList;
            if (
              typeof stateCache.entityManagerProps.animalsList !== "undefined"
            ) {
              clearInterval(animalsListInterval);
            }
          }, 1000);
          stateCache.socketManager =
            getAllPropertyNames(state.gameInstance).find(
              (networkClientKey) =>
                typeof state.gameInstance[networkClientKey]?.sendBytePacket !==
                "undefined",
            ) || stateCache.socketManager;
          try {
            state.globalState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let myAnimalsInterval;
          try {
            clearInterval(myAnimalsInterval);
          } catch {}
          myAnimalsInterval = setInterval(() => {
            try {
              if (!state.playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = state.playerData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                const fadingTrailPrototype = Object.getPrototypeOf(
                  firstAnimal.fadingTrail,
                );
                wrapPropertyWithProxy(fadingTrailPrototype, "enable", {
                  apply() {},
                });
              }
              if (firstAnimal.bubblesEmitter) {
                const bubblesEmitterPrototype = Object.getPrototypeOf(
                  firstAnimal.bubblesEmitter,
                );
                Object.defineProperty(bubblesEmitterPrototype, "emit", {
                  set: () => {},
                });
              }
              clearInterval(myAnimalsInterval);
            } catch {}
          }, 200);
          if (lastExecutionTime < Date.now() - 3000) {
            showNotification("✅ Astraphobia client loaded in game");
            lastExecutionTime = Date.now();
          }
          initControlOverlay();
        }
      } catch {}
      return propertyCache.apply(callContext, callArgs, callOptions);
    },
  });
};

export { setupProxyHooks };
