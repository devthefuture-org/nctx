const asyncHooks = require("async_hooks");

const defaultsDeep = require("lodash.defaultsdeep");
const merge = require("lodash.merge");

const Registry = require("./registry");
const { isObjectKey } = require("./utils");
const { handler, requireHandler } = require("./proxy-handlers");

class Context {
  static create(name) {
    return new Context(name);
  }

  static fork(func, ctxArr = [], deepFork = false) {
    return new Promise((resolve, reject) => {
      setImmediate(async () => {
        try {
          for (const ctx of ctxArr) {
            ctx.forkAsyncHookContext(deepFork);
          }
          resolve(await func());
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  constructor(name = Symbol()) {
    this.name = name;
    this.store = new Map();
    this.sharedRefStore = new Map();
    this.fallbackCtx = null;

    this.proxy = new Proxy(this, handler);
    this.proxyRequire = new Proxy(this, requireHandler);
  }

  storeRequire(key) {
    if (!this.store.has(key)) {
      throw new Error(
        `calling context "${this.name.toString()}" from unprovided env, please use provide in a parent async branch`
      );
    }
    return this.store.get(key);
  }

  provide(ref) {
    const currentAsyncId = asyncHooks.executionAsyncId();
    const { store } = this;

    if (store.has(currentAsyncId)) {
      return;
    }

    const asyncHook = asyncHooks.createHook({
      init: (newAsyncId, _, parentAsyncId) => {
        if (store.has(parentAsyncId)) {
          store.set(newAsyncId, store.get(parentAsyncId));
        }
      },
      destroy: (asyncId) => {
        if (store.has(asyncId)) {
          store.delete(asyncId);
        }
      },
    });

    const registry = Registry.create();
    store.set(currentAsyncId, registry);

    asyncHook.enable();

    if (ref) {
      this.share(ref);
    }
  }

  fork(callback, deepFork = false) {
    return Context.fork(callback, [this], deepFork);
  }

  forkAsyncHookContext(deepFork = false) {
    const asyncId = asyncHooks.executionAsyncId();
    const parentRegistry = this.storeRequire(asyncId);
    const registry = Registry.create();
    if (deepFork) {
      defaultsDeep(registry.obj, parentRegistry.obj);
    } else {
      Object.assign(registry.obj, parentRegistry.obj);
    }
    registry.map = new Map(parentRegistry.map);
    registry.parent = parentRegistry;
    this.store.set(asyncId, registry);
  }

  fallback(ctx) {
    this.fallbackCtx = ctx;
  }

  merge(...params) {
    const asyncId = asyncHooks.executionAsyncId();
    const registry = this.storeRequire(asyncId);
    const { obj, map } = registry;
    for (const [key, val] of Object.entries(params)) {
      if (isObjectKey(key)) {
        if (
          typeof val === "object" &&
          val !== null &&
          typeof obj[key] === "object" &&
          obj[key] !== null
        ) {
          merge(obj, val);
        } else {
          obj[key] = val;
        }
      } else {
        map.set(key, val);
      }
    }
  }

  share(ref) {
    const newAsyncId = asyncHooks.executionAsyncId();
    if (!this.sharedRefStore.has(ref)) {
      const sharedCtx = this.store.get(newAsyncId);
      this.sharedRefStore.set(ref, newAsyncId);
      this.store.set(newAsyncId, sharedCtx);
    } else {
      const sharedAsyncId = this.sharedRefStore.get(ref);
      if (sharedAsyncId !== newAsyncId) {
        this.store.set(newAsyncId, this.store.get(sharedAsyncId));
      }
    }
  }

  endShare(ref) {
    this.sharedRefStore.delete(ref);
  }

  get(key) {
    if (key === undefined) {
      return this.proxy;
    }
    if (Array.isArray(key)) {
      return key.map((k) => this.get(k));
    }
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    const v = registry.get(key);
    if (v === undefined && this.fallbackCtx) {
      return this.fallbackCtx.get(key);
    }
    return v;
  }

  set(key, val) {
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    registry.set(key, val);
  }

  assign(obj) {
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    registry.assign(obj);
  }

  getParent(key) {
    if (Array.isArray(key)) {
      return key.map((k) => this.getParent(k));
    }
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    return registry.parent.get(key);
  }

  setParent(key, val) {
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    registry.parent.set(key, val);
  }

  assignParent(obj) {
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    registry.parent.assign(obj);
  }

  require(key) {
    if (key === undefined) {
      return this.proxyRequire;
    }
    if (Array.isArray(key)) {
      return key.map((k) => this.require(k));
    }
    const val = this.get(key);
    if (!val) {
      throw new Error(
        `missing required context value for "${key}" in context "${this.name.toString()}"`
      );
    }
    return val;
  }
}

module.exports = Context;
