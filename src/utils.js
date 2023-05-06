const isObjectKey = (key) => {
  return typeof key === "string" || typeof key === "number";
};

const composeReducer =
  (...fns) =>
  (x) =>
    fns.reduceRight((res, fn) => fn(res), x);

module.exports = {
  isObjectKey,
  composeReducer,
};
