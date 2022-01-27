const get = require("lodash.get");
const set = require("lodash.set");

const { isObjectKey } = require("./utils");

class Registry {
  static create() {
    return new Registry();
  }

  constructor() {
    this.obj = {};
    this.map = new Map();
    this.parent = null;
  }

  get(key) {
    if (key === undefined) {
      return this.obj;
    }
    if (isObjectKey(key)) {
      return get(this.obj, key);
    }
    return this.map.get(key);
  }

  set(key, val) {
    if (isObjectKey(key)) {
      set(this.obj, key, val);
    } else {
      this.map.set(key, val);
    }
  }

  assign(obj = {}) {
    for (const [k, v] of Object.entries(obj)) {
      this.set(k, v);
    }
  }
}

module.exports = Registry;
