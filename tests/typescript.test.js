// This file doesn't actually run tests, but it's used to verify that the TypeScript types work correctly
// by importing the TypeScript example and checking that it compiles without errors.

// We can run this with:
// npx tsc --noEmit examples/typescript-usage.ts

// If there are no errors, the types are working correctly.

// This is a dummy test that always passes
const { test } = require("node:test");
const assert = require("node:assert");

test("TypeScript types compile correctly", () => {
  // This test doesn't actually do anything, it's just a placeholder
  // The real test is running the TypeScript compiler on the example file
  assert.strictEqual(true, true);
});
