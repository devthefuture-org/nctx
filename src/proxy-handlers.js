module.exports.handler = {
  get(obj, key) {
    return obj.get(key);
  },
  has(obj, key) {
    return !!obj.get(key);
  },
  set(obj, key, value) {
    return obj.set(key, value);
  },
};

module.exports.requireHandler = {
  get(obj, key) {
    return obj.require(key);
  },
};
