import { Registry } from './registry';

export declare class Context {
  static create(name?: symbol | string): Context;
  static provide(
    ctxArr: Context | Context[] | undefined,
    callback: Function,
    ref?: any,
    syncFollowers?: boolean,
    forceOverride?: boolean
  ): Promise<any>;
  static fork(
    ctxArr: Context | Context[] | undefined,
    callback: Function,
    deepFork?: boolean,
    syncFollowers?: boolean
  ): any;

  constructor(name?: symbol | string);

  name: symbol | string;
  store: Map<any, any>;
  sharedRefStore: Map<any, any>;
  fallbackCtx: Context | null;
  followedByCtx: Set<Context>;
  proxy: Context;
  proxyRequire: Context;
  asyncLocalStorage: any; // AsyncLocalStorage from node:async_hooks

  storeRequire(): Registry;
  provide(
    callback: Function,
    ref?: any,
    syncFollowers?: boolean,
    forceOverride?: boolean
  ): any;
  isProvided(): boolean;
  getDefault(key: any): any;
  fork(callback: Function, deepFork?: boolean, syncFollowers?: boolean): any;
  unfollow(ctx: Context): this;
  follow(ctx: Context): this;
  followedBy(ctx: Context): this;
  unfollowedBy(ctx: Context): this;
  fallback(ctx: Context): this;
  merge(...params: any[]): void;
  share(ref: any): this;
  endShare(ref: any): this;
  get(key?: any): any;
  set(key: any, val: any): any;
  assign(obj: Record<string, any>): Record<string, any>;
  replace(key: any, callback: (value: any) => any): any;
  getParent(key: any): any;
  setParent(key: any, val: any): any;
  assignParent(obj: Record<string, any>): Record<string, any>;
  require(key?: any, strict?: boolean): any;
}
