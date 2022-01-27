const asyncHooks = require("async_hooks");

const defaultsDeep = require("lodash.defaultsdeep");
const merge = require("lodash.merge");

const Registry = require("./registry");
const { isObjectKey } = require("./utils");

class Context {
  static create(name) {
    return new Context(name);
  }

  constructor(name) {
    this.name = name;
    this.store = new Map();
    this.sharedRefStore = new Map();
  }

  storeRequire(key) {
    if (!this.store.has(key)) {
      throw new Error(
        `calling context "${this.name}" from unprovided env, please use provide in a parent async branch`
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

  fork() {
    const asyncId = asyncHooks.executionAsyncId();
    const parentRegistry = this.storeRequire(asyncId);
    const registry = Registry.create();
    defaultsDeep(registry.obj, parentRegistry.obj);
    registry.map = new Map(parentRegistry.map);
    registry.parent = parentRegistry;
    this.store.set(asyncId, registry);
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
    if (Array.isArray(key)) {
      return key.map((k) => this.get(k));
    }
    const registry = this.storeRequire(asyncHooks.executionAsyncId());
    return registry.get(key);
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
    if (Array.isArray(key)) {
      return key.map((k) => this.required(k));
    }
    const val = this.get(key);
    if (!val) {
      throw new Error(`missing required context value for "${key}"`);
    }
    return val;
  }
}

module.exports = Context;
