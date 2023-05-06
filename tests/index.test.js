const assert = require("node:assert");

// eslint-disable-next-line node/no-missing-require
const { describe, it } = require("node:test");

const nctx = require("../");

describe("fork", () => {
  const funcCtx1 = nctx.create();
  const func = async () => {
    const foo = funcCtx1.require("foo");
    return `foo=${foo}`;
  };

  funcCtx1.provide();
  funcCtx1.set("hello", "world");

  funcCtx1.set("foo", "bar");

  it("should fork without override", async () => {
    const result = await Promise.all([
      nctx.fork(() => {
        funcCtx1.set("foo", "jo");
        return func();
      }, [funcCtx1]),
      func(),
    ]);

    const [a, b] = result;
    assert.strictEqual(a, "foo=jo");
    assert.strictEqual(b, "foo=bar");
  });
});

describe("fallback", () => {
  const root = nctx.create(Symbol("root"));
  const ctx1 = nctx.create(Symbol("ctx1"));

  root.provide();
  ctx1.provide();
  ctx1.fallback(root);

  it("should fallback without override", () => {
    root.set("foo", "bar");
    assert.strictEqual(ctx1.get("foo"), "bar");

    ctx1.set("foo", "baz");
    assert.strictEqual(ctx1.get("foo"), "baz");

    assert.strictEqual(root.get("foo"), "bar");
  });
});
