import { getAllPropertyNames } from "../utils.js";
import { privateMap, wrapWithProxy, state, coreSharedState } from "../core.js";
import { showToast } from "../ui/interaction.js";

const initializeAntiDetection = () => {
  if (coreSharedState.isProcessed) {
    return;
  }
  coreSharedState.isProcessed = true;
  const cache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[propertyKey] = Reflect[propertyKey];
  }
  const Proxy = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (registry, key, options) => {
    const instance = new Proxy(registry[key], options);
    privateMap.set(instance, registry[key]);
    registry[key] = instance;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisContext, paramKey, args) {
      return cache.apply(
        thisContext,
        privateMap.get(paramKey) || paramKey,
        args,
      );
    },
  });
  wrapValue(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapValue(Proxy, "revocable", {
    apply(targetContext, params, extraParams) {
      return cache.apply(targetContext, params, extraParams);
    },
  });
  let lastTimestamp = 0;
  wrapValue(Function.prototype, "bind", {
    apply(thisArg, argsArray, extraArgs) {
      try {
        try {
          if (
            lookupGetter.call(extraArgs[0], "aboveBgPlatformsContainer") != null
          ) {
            return cache.apply(thisArg, argsArray, extraArgs);
          }
        } catch {}
        if (extraArgs[0] && extraArgs[0].aboveBgPlatformsContainer != null) {
          coreSharedState.playerData = extraArgs[0];
          coreSharedState.game = extraArgs[0].game;
          window.__cachedEM = null;
          const allProperties = getAllPropertyNames(coreSharedState.playerData);
          const obfuscatedProperties = allProperties.filter((varName) =>
            varName.startsWith("_0x"),
          );
          state.setFlash =
            Object.getOwnPropertyNames(
              coreSharedState.playerData.__proto__.__proto__,
            )
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (functionKey) =>
                  coreSharedState.playerData[functionKey] instanceof Function,
              ) || state.setFlash;
          state.terrainManager =
            obfuscatedProperties.find(
              (shadowKey) =>
                typeof coreSharedState.playerData[shadowKey]?.shadow !==
                "undefined",
            ) || state.terrainManager;
          state.entityManager =
            obfuscatedProperties.find(
              (entitiesKey) =>
                typeof coreSharedState.playerData[entitiesKey]?.entitiesList !==
                "undefined",
            ) || state.entityManager;
          state.socketManager =
            getAllPropertyNames(coreSharedState.game).find(
              (networkKey) =>
                typeof coreSharedState.game[networkKey]?.sendBytePacket !==
                "undefined",
            ) || state.socketManager;
          try {
            coreSharedState.globalState = document
              .getElementById("app")
              ._vnode.appContext.config.globalProperties.$simpleState.states.find(
                (gameStore) => gameStore._storeMeta.id === "game",
              );
          } catch {}
          let intervalId;
          try {
            clearInterval(intervalId);
          } catch {}
          intervalId = setInterval(() => {
            try {
              if (!coreSharedState.playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = coreSharedState.playerData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                wrapWithProxy(
                  Object.getPrototypeOf(firstAnimal.fadingTrail),
                  "enable",
                  {
                    apply() {},
                  },
                );
              }
              if (firstAnimal.bubblesEmitter) {
                Object.defineProperty(
                  Object.getPrototypeOf(firstAnimal.bubblesEmitter),
                  "emit",
                  {
                    set: () => {},
                  },
                );
              }
              clearInterval(intervalId);
            } catch {}
          }, 200);
          if (coreSharedState.lastTimestamp < Date.now() - 3000) {
            showToast("Client loaded");
            coreSharedState.lastTimestamp = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisArg, argsArray, extraArgs);
    },
  });
};

export { initializeAntiDetection };
