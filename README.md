# nctx

[![npm version](https://img.shields.io/npm/v/nctx.svg)](https://www.npmjs.com/package/nctx)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## What is nctx?

**nctx** is a lightweight, powerful Dependency Injection (DI) container for Node.js applications, enhanced with native `async_hooks` capabilities. It implements the Inversion of Control (IoC) pattern, allowing you to decouple components and manage dependencies throughout your application's asynchronous execution flow.

### Inversion of Control (IoC) and Dependency Injection

Inversion of Control is a design principle where the control flow of a program is inverted: instead of your code controlling when and how dependencies are created and used, this control is delegated to an external container. Dependency Injection is a specific implementation of IoC where dependencies are "injected" into components rather than created within them.

nctx provides an elegant solution for implementing these patterns in Node.js applications, making it easier to:

- Share request-scoped data across your application without passing it through function parameters
- Isolate execution contexts in concurrent operations
- Implement clean dependency injection patterns
- Avoid callback hell and parameter pollution

Built on Node.js's native [async_hooks API](https://nodejs.org/api/async_hooks.html), nctx maintains context across asynchronous boundaries automatically, with minimal overhead.

## Table of Contents

- [What is nctx?](#what-is-nctx)
  - [Inversion of Control (IoC) and Dependency Injection](#inversion-of-control-ioc-and-dependency-injection)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
  - [Async Context](#async-context)
  - [Context](#context)
  - [Registry](#registry)
  - [Providing and Accessing Context](#providing-and-accessing-context)
- [Basic Usage](#basic-usage)
  - [JavaScript Example](#javascript-example)
  - [TypeScript Example](#typescript-example)
- [Common Use Cases](#common-use-cases)
  - [Forking Contexts](#forking-contexts)
    - [Why Fork Contexts?](#why-fork-contexts)
    - [Simple Forking Example](#simple-forking-example)
    - [Deep vs. Shallow Forking](#deep-vs-shallow-forking)
  - [Express Integration](#express-integration)
  - [Logging and Error Handling](#logging-and-error-handling)
- [API Reference](#api-reference)
  - [Context Creation](#context-creation)
  - [Context Methods](#context-methods)
  - [Static Methods](#static-methods)
- [Advanced Usage](#advanced-usage)
  - [Context Relationships](#context-relationships)
    - [Following Contexts](#following-contexts)
    - [Fallback Contexts](#fallback-contexts)
  - [Sharing Contexts](#sharing-contexts)
  - [Extending Contexts](#extending-contexts)
    - [JavaScript Example](#javascript-example-1)
    - [TypeScript Example](#typescript-example-1)
- [Best Practices](#best-practices)
  - [Do's](#dos)
  - [Don'ts](#donts)
- [Running the Examples](#running-the-examples)
- [Related Libraries](#related-libraries)
- [Contributing](#contributing)

## Installation

```sh
# Using npm
npm install nctx

# Using yarn
yarn add nctx
```

**Requirements**: Node.js 16 or higher

## Core Concepts

### Async Context

In asynchronous applications, tracking the execution context across callbacks, promises, and event handlers can be challenging. nctx leverages Node.js's `AsyncLocalStorage` to maintain context throughout the entire asynchronous execution tree.

### Context

A `Context` is a container for storing and retrieving values within an asynchronous execution flow. Each context:

- Has a unique identifier (name)
- Can store values using keys
- Maintains isolation between different execution paths
- Can be forked to create isolated sub-contexts

### Registry

A `Registry` is the internal storage mechanism for a context. It contains:

- An object store for string/number keys
- A Map for non-primitive keys (like Symbols)
- Optional parent reference for hierarchical lookups

### Providing and Accessing Context

The core workflow with nctx involves:

1. **Creating** a context
2. **Providing** the context for an async operation
3. **Setting** values in the context
4. **Getting** values from the context within the async tree

## Basic Usage

### JavaScript Example

```javascript
// CommonJS
const nctx = require('nctx');

// Create a context
const myContext = nctx.create(Symbol('myContext'));

async function main() {
  // Provide a context for the async operation
  await myContext.provide(async () => {
    // Set a value in the context
    myContext.set('message', 'Hello, World!');
    
    // The value is available anywhere in this async tree
    await someAsyncOperation();
  });
}

async function someAsyncOperation() {
  // Get the value from the context
  const message = myContext.get('message');
  console.log(message); // Outputs: Hello, World!
}

main().catch(console.error);
```

### TypeScript Example

```typescript
import nctx from 'nctx';
import { Context } from 'nctx';

// Create a context with type annotation
const myContext: Context = nctx.create(Symbol('myContext'));

// Define an interface for your context data (optional but recommended)
interface AppContext {
  message: string;
  count: number;
  user?: {
    id: string;
    role: 'admin' | 'user';
  };
}

async function main(): Promise<void> {
  await myContext.provide(async () => {
    // Set values with proper types
    myContext.set('message', 'Hello, TypeScript!');
    myContext.set('count', 42);
    myContext.set('user', {
      id: 'user-123',
      role: 'admin' as const
    });
    
    await someAsyncOperation();
  });
}

async function someAsyncOperation(): Promise<void> {
  // Get values with type assertions
  const message = myContext.get('message') as string;
  const count = myContext.get('count') as number;
  const user = myContext.get('user') as AppContext['user'];
  
  console.log(message); // Hello, TypeScript!
  console.log(`Count: ${count}`); // Count: 42
  
  if (user) {
    console.log(`User: ${user.id}, Role: ${user.role}`);
  }
}

main().catch((error: Error) => {
  console.error('Error:', error.message);
});
```

## Common Use Cases

### Forking Contexts

Forking allows you to create isolated copies of a context, which is particularly useful for handling concurrent operations where each needs its own context values.

#### Why Fork Contexts?

- Run parallel operations with different context values
- Isolate changes to prevent them from affecting the parent context
- Create temporary context modifications

#### Simple Forking Example

```javascript
const nctx = require('nctx');

const userContext = nctx.create(Symbol('userContext'));

async function processUsers(users) {
  await userContext.provide(async () => {
    // Set a default value
    userContext.set('role', 'guest');
    
    // Process each user in parallel with isolated contexts
    const results = await Promise.all(
      users.map(user => 
        // Fork the context for each parallel operation
        nctx.fork([userContext], async () => {
          // This change only affects this forked context
          userContext.set('userId', user.id);
          userContext.set('role', user.role);
          
          return processUserData(user);
        })
      )
    );
    
    // Here, userContext still has role='guest' and no userId
    console.log(userContext.get('role')); // 'guest'
    
    return results;
  });
}

async function processUserData(user) {
  // Access the forked context values
  const userId = userContext.get('userId');
  const role = userContext.get('role');
  
  console.log(`Processing user ${userId} with role ${role}`);
  // ... processing logic
}
```

#### Deep vs. Shallow Forking

nctx supports two forking modes:

```javascript
// Shallow fork (default) - Object references are shared
nctx.fork([myContext], () => { /* ... */ });

// Deep fork - Creates deep copies of objects
nctx.fork([myContext], () => { /* ... */ }, true);
```

With shallow forking (the default), object references are shared between the parent and forked context. With deep forking, objects are deeply cloned, allowing you to modify nested properties without affecting the parent context.

### Express Integration

nctx is particularly useful in web applications where you need to maintain request-scoped data. Here's how to integrate it with Express:

```javascript
// ctx/req.js
const nctx = require('nctx');

const reqCtx = nctx.create(Symbol('req'));

// Create middleware to establish the request context
reqCtx.createAppMiddleware = () => {
  return (req, res, next) => {
    reqCtx.provide(() => {
      // Share the context with the request object
      reqCtx.share(req);
      
      // Clean up when the response is finished
      res.on('finish', () => {
        reqCtx.endShare(req);
      });
      
      // Store the request object in the context
      reqCtx.set('req', req);
      next();
    });
  };
};

// Middleware for routers to ensure they have access to the context
reqCtx.createRouterMiddleware = () => {
  return (req, _res, next) => {
    reqCtx.share(req);
    if (next) {
      next();
    }
  };
};

module.exports = reqCtx;
```

```javascript
// app.js
const express = require('express');
const reqCtx = require('./ctx/req');

const app = express();

// Apply the context middleware
app.use(reqCtx.createAppMiddleware());

// Add request-specific data to the context
app.use(async (req, _res, next) => {
  const logger = createLogger().child({ requestId: req.id, path: req.path });
  reqCtx.set('logger', logger);
  
  // You could also add user info after authentication
  // reqCtx.set('user', req.user);
  
  next();
});

const router = express.Router();
router.use(reqCtx.createRouterMiddleware());
app.use(router);

// Now you can access the context anywhere in your route handlers
router.get('/api/data', async (req, res) => {
  // Get the request-scoped logger
  const logger = reqCtx.get('logger');
  logger.info('Processing request');
  
  // Business logic...
  const data = await fetchData();
  
  res.json(data);
});

// Even in deeply nested service functions
async function fetchData() {
  const logger = reqCtx.get('logger');
  logger.debug('Fetching data');
  
  // The logger is specific to the current request
  return { /* ... */ };
}

app.listen(3000);
```

### Logging and Error Handling

nctx makes it easy to implement consistent logging with request-specific information:

```javascript
// Create a logger context
const loggerCtx = nctx.create(Symbol('logger'));

// Middleware to set up the logger
function loggerMiddleware(req, res, next) {
  loggerCtx.provide(() => {
    const requestId = generateRequestId();
    
    // Create a request-specific logger
    const logger = createBaseLogger().child({
      requestId,
      path: req.path,
      method: req.method
    });
    
    // Store in context
    loggerCtx.set('logger', logger);
    loggerCtx.set('requestId', requestId);
    
    // Add requestId to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Log the request
    logger.info(`Received ${req.method} request to ${req.path}`);
    
    // Track timing
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`Request completed in ${duration}ms with status ${res.statusCode}`);
    });
    
    next();
  });
}

// Now you can access the logger anywhere
function businessLogic() {
  const logger = loggerCtx.get('logger');
  logger.debug('Executing business logic');
  
  try {
    // ... logic
  } catch (error) {
    // Log with request context already included
    logger.error('Error in business logic', { error: error.message });
    throw error;
  }
}
```

## API Reference

### Context Creation

```javascript
// Create a new context
const myContext = nctx.create(Symbol('myContext'));
```

### Context Methods

| Method | Description | Example |
|--------|-------------|---------|
| `provide(callback, ref?, syncFollowers?, forceOverride?)` | Establishes a context for the async operation | `myContext.provide(() => { /* async operations */ })` |
| `get(key)` | Retrieves a value from the context | `const value = myContext.get('key')` |
| `set(key, value)` | Sets a value in the context | `myContext.set('key', 'value')` |
| `require(key, strict?)` | Gets a value, throws if not found | `const value = myContext.require('key')` |
| `fork(callback, deepFork?, syncFollowers?)` | Creates an isolated copy of the context | `myContext.fork(() => { /* operations with isolated context */ })` |
| `isProvided()` | Checks if the context is provided | `if (myContext.isProvided()) { /* ... */ }` |
| `share(ref)` | Shares context with a reference | `myContext.share(req)` |
| `endShare(ref)` | Ends context sharing | `myContext.endShare(req)` |
| `follow(ctx)` | Makes this context follow another | `myContext.follow(otherContext)` |
| `unfollow(ctx)` | Stops following another context | `myContext.unfollow(otherContext)` |
| `fallback(ctx)` | Sets a fallback context | `myContext.fallback(defaultContext)` |
| `merge(...params)` | Merges values into the context | `myContext.merge({ key1: 'value1', key2: 'value2' })` |
| `assign(obj)` | Assigns an object to the context | `myContext.assign({ key1: 'value1', key2: 'value2' })` |
| `replace(key, callback)` | Updates a value using a callback | `myContext.replace('counter', count => count + 1)` |

### Static Methods

| Method | Description | Example |
|--------|-------------|---------|
| `nctx.create(name?)` | Creates a new context | `const ctx = nctx.create(Symbol('name'))` |
| `nctx.provide(ctxArr, callback, ref?, syncFollowers?, forceOverride?)` | Provides multiple contexts | `nctx.provide([ctx1, ctx2], () => { /* ... */ })` |
| `nctx.fork(ctxArr, callback, deepFork?, syncFollowers?)` | Forks multiple contexts | `nctx.fork([ctx1, ctx2], () => { /* ... */ })` |

## Advanced Usage

### Context Relationships

nctx allows you to establish relationships between contexts:

#### Following Contexts

When context A follows context B, operations on B will also affect A:

```javascript
const contextA = nctx.create(Symbol('A'));
const contextB = nctx.create(Symbol('B'));

// Make A follow B
contextA.follow(contextB);

// Now when you provide B, A is also provided
contextB.provide(() => {
  contextB.set('key', 'value');
  
  // A can access the value
  console.log(contextA.get('key')); // 'value'
});
```

#### Fallback Contexts

You can set a fallback context to use when a key isn't found:

```javascript
const mainContext = nctx.create(Symbol('main'));
const defaultContext = nctx.create(Symbol('default'));

// Set up the default context
defaultContext.provide(() => {
  defaultContext.set('theme', 'dark');
  defaultContext.set('language', 'en');
  
  // Set main context to fall back to default
  mainContext.fallback(defaultContext);
  
  mainContext.provide(() => {
    // Override just one setting
    mainContext.set('theme', 'light');
    
    // This comes from main context
    console.log(mainContext.get('theme')); // 'light'
    
    // This falls back to default context
    console.log(mainContext.get('language')); // 'en'
  });
});
```

### Sharing Contexts

The `share` method allows you to associate a context with a reference (like a request object):

```javascript
const reqCtx = nctx.create(Symbol('req'));

function middleware(req, res, next) {
  reqCtx.provide(() => {
    // Associate this context with the request
    reqCtx.share(req);
    
    // Later, in another middleware or route handler
    // that has the same req object:
    reqCtx.share(req); // This will reuse the same context
    
    // Clean up when done
    res.on('finish', () => {
      reqCtx.endShare(req);
    });
    
    next();
  });
}
```

### Extending Contexts

You can extend contexts with custom getter and setter methods to create a more intuitive and type-safe API:

#### JavaScript Example

```javascript
const nctx = require('nctx');

// Create a base context
const appContext = nctx.create(Symbol('app'));

// Extend the context with custom getters
appContext.getLogger = function() {
  return this.get('logger');
};

appContext.getConfig = function() {
  return this.get('config');
};

// Add custom setters
appContext.setLogger = function(logger) {
  this.set('logger', logger);
  return this; // For method chaining
};

appContext.setConfig = function(config) {
  this.set('config', config);
  return this; // For method chaining
};

// Usage
appContext.provide(() => {
  // Use the setter
  appContext.setLogger(createLogger());
  
  // Use the getter
  const logger = appContext.getLogger();
  logger.info('Application started');
  
  // Method chaining
  appContext
    .setConfig({ env: 'production' })
    .set('version', '1.0.0');
});
```

#### TypeScript Example

```typescript
import nctx from 'nctx';
import { Context } from 'nctx';
import { Logger } from 'your-logger-library';

// Define extended context interface
interface AppContext extends Context {
  // Getters
  getLogger(): Logger;
  getConfig(): Record<string, any>;
  
  // Setters
  setLogger(logger: Logger): this;
  setConfig(config: Record<string, any>): this;
}

// Create and extend the context
const baseContext = nctx.create(Symbol('app'));
const appContext = baseContext as AppContext;

// Implement the getters
appContext.getLogger = function(this: AppContext): Logger {
  return this.get('logger') as Logger;
};

appContext.getConfig = function(this: AppContext): Record<string, any> {
  return this.get('config') as Record<string, any>;
};

// Implement the setters
appContext.setLogger = function(this: AppContext, logger: Logger): AppContext {
  this.set('logger', logger);
  return this;
};

appContext.setConfig = function(this: AppContext, config: Record<string, any>): AppContext {
  this.set('config', config);
  return this;
};

// Usage with proper typing
appContext.provide(() => {
  // Use the setter
  appContext.setLogger(createLogger());
  
  // Use the getter with proper type
  const logger: Logger = appContext.getLogger();
  logger.info('Application started with typed logger');
  
  // Method chaining with type safety
  appContext
    .setConfig({ env: 'production' })
    .set('version', '1.0.0');
});
```

This approach provides several benefits:
1. Type safety for both getting and setting values
2. Method chaining for a more fluent API
3. Better encapsulation of the underlying implementation
4. Improved developer experience with IDE autocompletion

## Best Practices

### Do's

- **Use symbols for context names** to avoid naming collisions
- **Clean up shared contexts** when they're no longer needed
- **Use TypeScript interfaces** to define your context structure
- **Keep contexts focused** on specific concerns (e.g., request context, user context)
- **Use `require()` instead of `get()`** when a value must be present

### Don'ts

- **Don't forget to provide a context** before using it
- **Don't rely on context outside of its async tree** without explicit sharing


## Running the Examples

The package includes examples for both CommonJS and TypeScript usage:

```sh
# Run the CommonJS example
npm run example:js

# Run the TypeScript example (requires ts-node)
npm run example:ts

# Check TypeScript types (verify that the types compile correctly)
npm run check-types
```

## Related Libraries

- [node-simple-context](https://github.com/maxgfr/node-simple-context) by [@maxgfr](https://github.com/maxgfr)

## Contributing

We welcome contributions! If you encounter a bug or have a feature suggestion, please open an issue. To contribute code, simply fork the repository and submit a pull request.

This repository is mirrored on both GitHub and Codeberg. Contributions can be made on either platform, as the repositories are synchronized bidirectionally. 
- Codeberg: [https://codeberg.org/devthefuture/nctx](https://codeberg.org/devthefuture/nctx)
- GitHub: [https://github.com/devthefuture-org/nctx](https://github.com/devthefuture-org/nctx)

For more information:
- [Why mirror to Codeberg?](https://codeberg.org/Recommendations/Mirror_to_Codeberg#why-should-we-mirror-to-codeberg)
- [GitHub to Codeberg mirroring tutorial](https://codeberg.org/Recommendations/Mirror_to_Codeberg#github-codeberg-mirroring-tutorial)
