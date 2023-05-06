const assert = require("node:assert");

// eslint-disable-next-line node/no-missing-require
const { describe, test } = require("node:test");

const nctx = require("../");

describe("fork", () => {
  const funcCtx1 = nctx.create();
  const func = async () => {
    const foo = funcCtx1.require("foo");
    return `foo=${foo}`;
  };

  test("fork without overlap", async () => {
    await funcCtx1.provide(async () => {
      funcCtx1.set("hello", "world");
      funcCtx1.set("foo", "bar");
      const result = await Promise.all([
        nctx.fork([funcCtx1], () => {
          funcCtx1.set("foo", "jo");
          return func();
        }),
        func(),
      ]);

      const [a, b] = result;
      assert.strictEqual(a, "foo=jo");
      assert.strictEqual(b, "foo=bar");
    });
  });
});

describe("fallback", () => {
  const root = nctx.create(Symbol("root"));
  const ctx1 = nctx.create(Symbol("ctx1"));
  test("fallback without overlap", async () => {
    ctx1.fallback(root);
    await nctx.provide([root, ctx1], async () => {
      root.set("foo", "bar");
      assert.strictEqual(ctx1.get("foo"), "bar");

      ctx1.set("foo", "baz");
      assert.strictEqual(ctx1.get("foo"), "baz");

      assert.strictEqual(root.get("foo"), "bar");
    });
  });
});
