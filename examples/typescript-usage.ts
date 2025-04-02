import nctx from '../src/index';
// Import types from the TypeScript definition files
import { Context } from '../types/context';
import { Registry } from '../types/registry';

// Create a context with explicit type annotation
const myContext: Context = nctx.create(Symbol('myContext'));

// Define an interface for our context data
interface AppContext {
  greeting: string;
  counter: number;
  user?: {
    name: string;
    role: 'admin' | 'user';
  };
}

// Example async function that uses the context with type annotations
async function exampleFunction(): Promise<void> {
  // Provide a context
  await myContext.provide(async () => {
    // Set values in the context with proper types
    myContext.set('greeting', 'Hello, TypeScript!');
    myContext.set('counter', 1);
    myContext.set('user', {
      name: 'TypeScript User',
      role: 'admin' as const
    });
    
    // Get values from the context with type assertions
    const greeting = myContext.get('greeting') as string;
    const counter = myContext.get('counter') as number;
    const user = myContext.get('user') as AppContext['user'];
    
    console.log(greeting); // Output: Hello, TypeScript!
    console.log(`Counter: ${counter}`); // Output: Counter: 1
    
    // Check if user exists before accessing its properties
    if (user) {
      console.log(`User: ${user.name}, Role: ${user.role}`); // Output: User: TypeScript User, Role: admin
    }
    
    // Fork the context
    await nctx.fork([myContext], async () => {
      // Modify values in the forked context
      myContext.set('greeting', 'Hello from forked context!');
      myContext.set('counter', 2);
      
      // Get the modified values with type assertions
      const forkedGreeting = myContext.get('greeting') as string;
      const forkedCounter = myContext.get('counter') as number;
      
      console.log(forkedGreeting); // Output: Hello from forked context!
      console.log(`Forked Counter: ${forkedCounter}`); // Output: Forked Counter: 2
      
      // Demonstrate type safety with the Registry type
      const registry: Registry = myContext.storeRequire();
      console.log('Registry accessed with proper typing:', registry !== null);
    });
    
    // The original context is unchanged
    const originalGreeting = myContext.get('greeting') as string;
    const originalCounter = myContext.get('counter') as number;
    
    console.log(originalGreeting); // Output: Hello, TypeScript!
    console.log(`Original Counter: ${originalCounter}`); // Output: Original Counter: 1
  });
}

// Run the example
exampleFunction().catch((error: Error) => {
  console.error('Error in example:', error.message);
});
