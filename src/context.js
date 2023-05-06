const { AsyncLocalStorage } = require("node:async_hooks");

const defaultsDeep = require("lodash/defaultsDeep");
const merge = require("lodash/merge");

const Registry = require("./registry");
const { isObjectKey, composeReducer } = require("./utils");
const { handler, requireHandler } = require("./proxy-handlers");

class Context {
  static create(name) {
    return new Context(name);
  }

  static async provide(ctxArr = [], callback, ref, syncFollowers = true) {
    if (!Array.isArray(ctxArr)) {
      ctxArr = [ctxArr];
    }

    const reducer = composeReducer(
      ...ctxArr.map(
        (ctx) => (func) => () => ctx.provide(func, ref, syncFollowers)
      )
    );

    return reducer(callback)();
  }

  static fork(ctxArr = [], callback, deepFork = false, syncFollowers = true) {
    if (!Array.isArray(ctxArr)) {
      ctxArr = [ctxArr];
    }
    const reducer = composeReducer(
      ...ctxArr.map(
        (ctx) => (func) => () => ctx.fork(func, deepFork, syncFollowers)
      )
    );
    return reducer(callback)();
  }

  constructor(name = Symbol()) {
    this.asyncLocalStorage = new AsyncLocalStorage();

    this.name = name;
    this.store = new Map();
    this.sharedRefStore = new Map();
    this.fallbackCtx = null;
    this.followedByCtx = new Set();

    this.proxy = new Proxy(this, handler);
    this.proxyRequire = new Proxy(this, requireHandler);
  }

  storeRequire() {
    const store = this.asyncLocalStorage.getStore();
    if (!store) {
      throw new Error(
        `calling context "${this.name.toString()}" from unprovided env, please use provide in a parent async branch`
      );
    }
    return store;
  }

  provide(callback, ref, syncFollowers = true) {
    if (syncFollowers) {
      return Context.provide(
        [this, ...this.followedByCtx],
        callback,
        ref,
        false
      );
    }
    const registry = Registry.create();
    return this.asyncLocalStorage.run(registry, () => {
      if (ref) {
        this.share(ref);
      }
      return callback();
    });
  }

  isProvided() {
    return !!this.asyncLocalStorage.getStore();
  }

  getDefault(key) {
    if (this.isProvided()) {
      return this.get(key);
    }
  }

  fork(callback, deepFork = false, syncFollowers = true) {
    if (syncFollowers) {
      return Context.fork(
        [this, ...this.followedByCtx],
        callback,
        deepFork,
        false
      );
    }
    const parentRegistry = this.storeRequire();
    const registry = Registry.create();
    if (deepFork) {
      defaultsDeep(registry.obj, parentRegistry.obj);
    } else {
      Object.assign(registry.obj, parentRegistry.obj);
    }
    registry.map = new Map(parentRegistry.map);
    registry.parent = parentRegistry;
    return this.asyncLocalStorage.run(registry, () => {
      return callback();
    });
  }

  unfollow() {
    ctx.unfollowedBy(this);
    return this;
  }
  follow() {
    ctx.followedBy(this);
    return this;
  }

  followedBy(ctx) {
    this.followedByCtx.add(ctx);
    return this;
  }
  unfollowedBy(ctx) {
    this.followedByCtx.delete(ctx);
    return this;
  }

  fallback(ctx) {
    this.fallbackCtx = ctx;
    return this;
  }

  merge(...params) {
    const registry = this.storeRequire();
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
    if (!this.sharedRefStore.has(ref)) {
      const sharedCtx = this.storeRequire();
      this.sharedRefStore.set(ref, sharedCtx);
    } else {
      const sharedCtx = this.sharedRefStore.get(ref);
      const ctx = this.storeRequire();
      ctx.replaceBy(sharedCtx);
    }
    return this;
  }

  endShare(ref) {
    this.sharedRefStore.delete(ref);
    return this;
  }

  get(key) {
    if (key === undefined) {
      return this.proxy;
    }
    if (Array.isArray(key)) {
      return key.map((k) => this.get(k));
    }
    const registry = this.storeRequire();
    const v = registry.get(key);
    if (v === undefined && this.fallbackCtx) {
      return this.fallbackCtx.get(key);
    }
    return v;
  }

  set(key, val) {
    const registry = this.storeRequire();
    registry.set(key, val);
    return val;
  }

  assign(obj) {
    const registry = this.storeRequire();
    registry.assign(obj);
    return obj;
  }

  replace(key, callback) {
    const value = callback(this.get(key));
    this.set(key, value);
    return value;
  }

  getParent(key) {
    if (Array.isArray(key)) {
      return key.map((k) => this.getParent(k));
    }
    const registry = this.storeRequire();
    return registry.parent.get(key);
  }

  setParent(key, val) {
    const registry = this.storeRequire();
    registry.parent.set(key, val);
    return val;
  }

  assignParent(obj) {
    const registry = this.storeRequire();
    registry.parent.assign(obj);
    return obj;
  }

  require(key, strict = true) {
    if (key === undefined) {
      return this.proxyRequire;
    }
    if (Array.isArray(key)) {
      return key.map((k) => this.require(k));
    }
    const val = this.get(key);
    if ((strict && val === undefined) || (!strict && !val)) {
      throw new Error(
        `missing required context value for "${key}" in context "${this.name.toString()}"`
      );
    }
    return val;
  }
}

module.exports = Context;
