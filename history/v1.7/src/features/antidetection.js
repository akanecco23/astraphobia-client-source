import { proxyProperty, getAllPropertyNames } from "../utils.js";
import { showNotification } from "../ui/interaction.js";
import { stateMap, settings, state } from "../core.js";

const initAntiTamper = () => {
  if (state.isReady) {
    return;
  }
  state.isReady = true;
  const cache = {};
  for (const reflectMethod of Object.getOwnPropertyNames(Reflect)) {
    cache[reflectMethod] = Reflect[reflectMethod];
  }
  const Proxy = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const wrapProperty = (target, key, value) => {
    const instance = new Proxy(target[key], value);
    stateMap.set(instance, target[key]);
    target[key] = instance;
  };
  wrapProperty(Function.prototype, "toString", {
    apply(thisArg, argsKey, callContext) {
      return cache.apply(
        thisArg,
        stateMap.get(argsKey) || argsKey,
        callContext,
      );
    },
  });
  wrapProperty(window, "Proxy", {
    construct(constructor, constructorArgs) {
      return cache.construct(constructor, constructorArgs);
    },
  });
  wrapProperty(Proxy, "revocable", {
    apply(applyThisArg, applyArgs, applyContext) {
      return cache.apply(applyThisArg, applyArgs, applyContext);
    },
  });
  let lastExecutionTime = 0;
  wrapProperty(Function.prototype, "bind", {
    apply(thisContext, args, extraArgs) {
      try {
        try {
          if (
            lookupGetter.call(extraArgs[0], "aboveBgPlatformsContainer") != null
          ) {
            return cache.apply(thisContext, args, extraArgs);
          }
        } catch {}
        if (extraArgs[0] && extraArgs[0].aboveBgPlatformsContainer != null) {
          state.animalData = extraArgs[0];
          state.gameInstance = extraArgs[0].game;
          window.__cachedEM = null;
          const propertyNames = getAllPropertyNames(state.animalData);
          const obfuscatedPropertyNames = propertyNames.filter((varName) =>
            varName.startsWith("_0x"),
          );
          settings.setFlash =
            Object.getOwnPropertyNames(state.animalData.__proto__.__proto__)
              .filter((propName) => propName.startsWith("_0x"))
              .find(
                (methodName) =>
                  state.animalData[methodName] instanceof Function,
              ) || settings.setFlash;
          settings.terrainManager =
            obfuscatedPropertyNames.find(
              (shadowEntityKey) =>
                typeof state.animalData[shadowEntityKey]?.shadow !==
                "undefined",
            ) || settings.terrainManager;
          settings.entityManager =
            obfuscatedPropertyNames.find(
              (entitiesListKey) =>
                typeof state.animalData[entitiesListKey]?.entitiesList !==
                "undefined",
            ) || settings.entityManager;
          settings.socketManager =
            getAllPropertyNames(state.gameInstance).find(
              (networkClientKey) =>
                typeof state.gameInstance[networkClientKey]?.sendBytePacket !==
                "undefined",
            ) || settings.socketManager;
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
              if (!state.animalData?.myAnimals?.[0]) {
                return;
              }
              const firstAnimal = state.animalData.myAnimals[0];
              if (firstAnimal.fadingTrail) {
                proxyProperty(
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
      return cache.apply(thisContext, args, extraArgs);
    },
  });
};

export { initAntiTamper };
