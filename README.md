# nctx

## IoC (Inversion of Control)
NodeJS Contextual Dependency Injection using native async_hooks

see https://nodejs.org/api/async_hooks.html

## installation
```sh
yarn add nctx
```
or
```sh
npm i nctx
```

## TypeScript Support

This package includes TypeScript type definitions. No additional installation is needed.

```typescript
import nctx from 'nctx';

const myContext = nctx.create(Symbol('myContext'));
```

### Running the Examples

The package includes examples for both CommonJS and TypeScript usage:

```sh
# Run the CommonJS example
npm run example:js

# Run the TypeScript example (requires ts-node)
npm run example:ts

# Check TypeScript types (verify that the types compile correctly)
npm run check-types
```

## usage example with express
ctx/app.js
```js
const nctx = require("nctx")
module.exports = nctx.create(Symbol("app"))
```

ctx/req.js
```js
const nctx = require("nctx")

const reqCtx = nctx.create(Symbol("req"))

reqCtx.createAppMiddleware = () => {
  return (req, res, next) => {
    reqCtx.provide(()=>{
      reqCtx.share(req)
      res.on("finish", () => {
        reqCtx.endShare(req)
      })
      reqCtx.set("req", req)
      next()
    })
  }
}
reqCtx.createRouterMiddleware = () => {
  return function (req, _res, next) {
    reqCtx.share(req)
    if (next) {
      next()
    }
  }
}

module.exports = reqCtx
```

app.js
```js
const express = require("express")
const reqCtx = require("~/ctx/req")

const app = express()

app.use(reqCtx.createAppMiddleware())

// middlewares context
app.use(async (req, _res, next) => {
  const reqLogger = logger.child({ path: req.path })
  reqCtx.set("logger", reqLogger)
  next()
})

const router = express.Router()
router.use(reqCtx.createRouterMiddleware())

app.use(router)

// now you can get contextual logger from anywhere you call reqCtx under async tree
router.get("/", async ()=>{
  const reqLogger = reqCtx.get("logger")
  // the reqLogger is specific to the query
})

```

## fork context

```js
const nctx = require("nctx")

const funcCtx1 = nctx.create()
const func = async () => {
  const foo = funcCtx1.require("foo")
  return `foo=${foo}`
}

const main = async () => {
  funcCtx1.provide(()=>{

    funcCtx1.set("foo", "bar")
  
    const result = await Promise.all([
      
      nctx.fork([funcCtx1], () => {
        funcCtx1.set("foo", "jo")
        // here func is executed under the forked context 1
        return func()
      }),
  
      nctx.fork([funcCtx1], () => {
        funcCtx1.set("foo", "devthejo")
        // here func is executed under the forked context 2
        return func()
      }),
  
      // here func is executed under original context
      func(),
  
    ])

  })


  console.log(result)
}

main()
```

## related libs
- [node-simple-context](https://github.com/maxgfr/node-simple-context) by [@maxgfr](https://github.com/maxgfr)


## Contributing:

We welcome contributions! If you encounter a bug or have a feature suggestion, please open an issue. To contribute code, simply fork the repository and submit a pull request.

This repository is mirrored on both GitHub and Codeberg. Contributions can be made on either platform, as the repositories are synchronized bidirectionally. 
- Codeberg: [https://codeberg.org/nctx/foundernetes](https://codeberg.org/nctx/foundernetes)
- GitHub: [https://github.com/nctx-org/foundernetes](https://github.com/nctx-org/foundernetes)

For more information:
- [Why mirror to Codeberg?](https://codeberg.org/Recommendations/Mirror_to_Codeberg#why-should-we-mirror-to-codeberg)
- [GitHub to Codeberg mirroring tutorial](https://codeberg.org/Recommendations/Mirror_to_Codeberg#github-codeberg-mirroring-tutorial)
