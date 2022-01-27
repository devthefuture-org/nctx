function isObjectKey(key) {
  return typeof key === "string" || typeof key === "number";
}

module.exports = {
  isObjectKey,
};
