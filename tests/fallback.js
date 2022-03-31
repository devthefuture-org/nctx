const nctx = require("../");

const root = nctx.create(Symbol("root"));
const ctx1 = nctx.create(Symbol("ctx1"));

const main = async () => {
  root.set("foo", "bar");

  console.log("ctx1", ctx1.get("foo"), "===bar");
  ctx1.set("foo", "baz");
  console.log("ctx1", ctx1.get("foo"), "===baz");
  console.log("root", root.get("foo"), "===bar");
};

root.provide();
ctx1.provide();
ctx1.fallback(root);

main();
