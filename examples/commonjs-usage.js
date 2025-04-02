// CommonJS usage example
const nctx = require("../src/index");

// Create a context
const myContext = nctx.create(Symbol("myContext"));

// Example async function that uses the context
async function exampleFunction() {
  // Provide a context
  await myContext.provide(async () => {
    // Set a value in the context
    myContext.set("greeting", "Hello, CommonJS!");

    // Get a value from the context
    const greeting = myContext.get("greeting");
    console.log(greeting); // Output: Hello, CommonJS!

    // Fork the context
    await nctx.fork([myContext], async () => {
      // Modify the value in the forked context
      myContext.set("greeting", "Hello from forked context!");

      // Get the modified value
      const forkedGreeting = myContext.get("greeting");
      console.log(forkedGreeting); // Output: Hello from forked context!
    });

    // The original context is unchanged
    const originalGreeting = myContext.get("greeting");
    console.log(originalGreeting); // Output: Hello, CommonJS!
  });
}

// Run the example
exampleFunction().catch(console.error);
