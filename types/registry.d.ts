export declare class Registry {
  static create(): Registry;

  constructor();

  obj: Record<string, any>;
  map: Map<any, any>;
  parent: Registry | null;

  get(key?: any): any;
  set(key: any, val: any): void;
  assign(obj?: Record<string, any>): void;
  replaceBy(registry: Registry): void;
}
