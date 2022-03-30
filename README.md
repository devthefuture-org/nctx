# nctx

## IoC (Inversion of Control)
NodeJS Contextual Dependency Injection using native async_hooks

see https://stackabuse.com/using-async-hooks-for-request-context-handling-in-node-js/
and https://nodejs.org/api/async_hooks.html

## installation
```sh
yarn add nctx
```
or
```sh
npm i nctx
```

## usage example with express
ctx/app.js
```js
const nctx = require("nctx")
module.exports = nctx.create("app")
```

ctx/req.js
```js
const nctx = require("nctx")

const reqCtx = nctx.create("req")

reqCtx.createAppMiddleware = () => {
  return (req, res, next) => {
    reqCtx.provide()
    reqCtx.share(req)
    res.on("finish", () => {
      reqCtx.endShare(req)
    })
    reqCtx.set("req", req)
    next()
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
  funcCtx1.provide()

  funcCtx1.set("foo", "bar")

  const result = await Promise.all([
    
    nctx.fork(() => {
      funcCtx1.set("foo", "jo")
      // here func is executed under the forked context 1
      return func()
    }, [funcCtx1]),

    nctx.fork(() => {
      funcCtx1.set("foo", "devthejo")
      // here func is executed under the forked context 2
      return func()
    }, [funcCtx1]),

    // here func is executed under original context
    func(),

  ])

  console.log(result)
}

main()
```