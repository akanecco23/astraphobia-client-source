import { getAllPropertyNames } from '../utils.js';
import { metadataMap, wrapWithProxy, configStore, state } from '../core.js';
import { showNotification } from '../ui/interaction.js';

let appState;
let isYoutubeApiReady = false;
const initAntiDetection = () => {
  if (isYoutubeApiReady) {
    return;
  }
  isYoutubeApiReady = true;
  const cacheStore = {};
  for (const propertyName of Object.getOwnPropertyNames(Reflect)) {
    cacheStore[propertyName] = Reflect[propertyName];
  }
  const ProxyConstructor = Proxy;
  const lookupGetter = Object.prototype.__lookupGetter__;
  const updateObjectProperty = (dataStore, dataKey, initialValue) => {
    const wrappedValue = new ProxyConstructor(dataStore[dataKey], initialValue);
    metadataMap.set(wrappedValue, dataStore[dataKey]);
    dataStore[dataKey] = wrappedValue;
  };
  updateObjectProperty(Function.prototype, "toString", {
    apply(thisContext, argsKey, bindingContext) {
      return cacheStore.apply(thisContext, metadataMap.get(argsKey) || argsKey, bindingContext);
    }
  });
  updateObjectProperty(window, "Proxy", {
    construct(constructorFunc, constructorArgs) {
      return cacheStore.construct(constructorFunc, constructorArgs);
    }
  });
  updateObjectProperty(ProxyConstructor, "revocable", {
    apply(targetFunction, functionArgs, functionContext) {
      return cacheStore.apply(targetFunction, functionArgs, functionContext);
    }
  });
  let lastExecutionTimestamp = 0;
  updateObjectProperty(Function.prototype, "bind", {
    apply(bindTargetContext, argumentsList, contextArgument) {
      try {
        try {
          if (lookupGetter.call(contextArgument[0], "aboveBgPlatformsContainer") != null) {
            return cacheStore.apply(bindTargetContext, argumentsList, contextArgument);
          }
        } catch {}
        if (contextArgument[0] && contextArgument[0].aboveBgPlatformsContainer != null) {
          state.animalData = contextArgument[0];
          state.gameInstance = contextArgument[0].game;
          window.__cachedEM = null;
          const processedData = getAllPropertyNames(state.animalData);
          const obfuscatedKeys = processedData.filter(obfuscatedName1 => obfuscatedName1.startsWith("_0x"));
          configStore.setFlash = Object.getOwnPropertyNames(state.animalData.__proto__.__proto__).filter(obfuscatedName2 => obfuscatedName2.startsWith("_0x")).find(functionKey => state.animalData[functionKey] instanceof Function) || configStore.setFlash;
          configStore.terrainManager = obfuscatedKeys.find(shadowElementKey => typeof state.animalData[shadowElementKey]?.shadow !== "undefined") || configStore.terrainManager;
          configStore.entityManager = obfuscatedKeys.find(entitiesListKey => typeof state.animalData[entitiesListKey]?.entitiesList !== "undefined") || configStore.entityManager;
          configStore.socketManager = getAllPropertyNames(state.gameInstance).find(packetSenderKey => typeof state.gameInstance[packetSenderKey]?.sendBytePacket !== "undefined") || configStore.socketManager;
          try {
            appState = document.getElementById("app")._vnode.appContext.config.globalProperties.$simpleState.states.find(gameStore => gameStore._storeMeta.id === "game");
          } catch {}
          let animalCheckInterval;
          try {
            clearInterval(animalCheckInterval);
          } catch {}
          animalCheckInterval = setInterval(() => {
            try {
              if (!state.animalData?.myAnimals?.[0]) {
                return;
              }
              const firstMyAnimal = state.animalData.myAnimals[0];
              if (firstMyAnimal.fadingTrail) {
                wrapWithProxy(Object.getPrototypeOf(firstMyAnimal.fadingTrail), "enable", {
                  apply() {}
                });
              }
              if (firstMyAnimal.bubblesEmitter) {
                Object.defineProperty(Object.getPrototypeOf(firstMyAnimal.bubblesEmitter), "emit", {
                  set: () => {}
                });
              }
              clearInterval(animalCheckInterval);
            } catch {}
          }, 200);
          if (lastExecutionTimestamp < Date.now() - 3000) {
            showNotification("Client loaded");
            lastExecutionTimestamp = Date.now();
          }
        }
      } catch {}
      return cacheStore.apply(bindTargetContext, argumentsList, contextArgument);
    }
  });
};

export { initAntiDetection };
