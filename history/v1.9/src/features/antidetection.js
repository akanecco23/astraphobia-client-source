import { getAllPropertyNames } from "../utils.js";
import { stateCache, wrapPropertyWithProxy, config, state } from "../core.js";
import { showNotification } from "../ui/interaction.js";

const initAntiDetection = () => {
  if (state.isReady_2) {
    return;
  }
  state.isReady_2 = true;
  const cache = {};
  for (const propertyKey of Object.getOwnPropertyNames(Reflect)) {
    cache[propertyKey] = Reflect[propertyKey];
  }
  const Proxy = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapValue = (context, key, value) => {
    const instance = new Proxy(context[key], value);
    stateCache.set(instance, context[key]);
    context[key] = instance;
  };
  wrapValue(Function.prototype, "toString", {
    apply(thisArg, args, contextArg) {
      return cache.apply(thisArg, stateCache.get(args) || args, contextArg);
    },
  });
  wrapValue(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapValue(Proxy, "revocable", {
    apply(targetFn, callArgs, callThisArg) {
      return cache.apply(targetFn, callArgs, callThisArg);
    },
  });
  let lastExecutionTime = 0;
  wrapValue(Function.prototype, "bind", {
    apply(thisContext, args_2, extraArgs) {
      try {
        try {
          if (
            lookupGetter.call(extraArgs[0], "aboveBgPlatformsContainer") != null
          ) {
            return cache.apply(thisContext, args_2, extraArgs);
          }
        } catch {}
        if (extraArgs[0] && extraArgs[0].aboveBgPlatformsContainer != null) {
          state.playerData = extraArgs[0];
          state.gameInstance = extraArgs[0].game;
          window.__cachedEM = null;
          const allKeys = getAllPropertyNames(state.playerData);
          const obfuscatedKeys = allKeys.filter((varName) =>
            varName.startsWith("_0x"),
          );
          config.setFlash =
            Object.getOwnPropertyNames(state.playerData.__proto__.__proto__)
              .filter((idName) => idName.startsWith("_0x"))
              .find(
                (methodName) =>
                  state.playerData[methodName] instanceof Function,
              ) || config.setFlash;
          config.terrainManager =
            obfuscatedKeys.find(
              (shadowKey) =>
                typeof state.playerData[shadowKey]?.shadow !== "undefined",
            ) || config.terrainManager;
          config.entityManager =
            obfuscatedKeys.find(
              (entitiesKey) =>
                typeof state.playerData[entitiesKey]?.entitiesList !==
                "undefined",
            ) || config.entityManager;
          config.socketManager =
            getAllPropertyNames(state.gameInstance).find(
              (networkKey) =>
                typeof state.gameInstance[networkKey]?.sendBytePacket !==
                "undefined",
            ) || config.socketManager;
          try {
            state.appState = document
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
              if (!state.playerData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = state.playerData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                wrapPropertyWithProxy(
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
          if (lastExecutionTime < Date.now() - 3000) {
            showNotification("Client loaded");
            lastExecutionTime = Date.now();
          }
        }
      } catch {}
      return cache.apply(thisContext, args_2, extraArgs);
    },
  });
};

export { initAntiDetection };
