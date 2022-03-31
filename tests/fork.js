const nctx = require("..");

const funcCtx1 = nctx.create();
const func = async () => {
  const foo = funcCtx1.require("foo");
  return `foo=${foo}`;
};

const main = async () => {
  funcCtx1.set("foo", "bar");

  const result = await Promise.all([
    nctx.fork(() => {
      funcCtx1.set("foo", "jo");
      return func();
    }, [funcCtx1]),
    func(),
  ]);

  console.log(result);
};

funcCtx1.provide();
funcCtx1.set("hello", "world");

main();
