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

## usage
ctx/app.js
```js
const nctx = require("nctx")
module.exports = nctx.create("app")
```

ctx/req.js
```js
const nctx = require("nctx")

const reqCtx = nctx.create("req")

reqCtx.createAppMiddleware = function createAppMiddleware() {
  return (req, res, next) => {
    reqCtx.provide(req)
    res.on("finish", () => {
      reqCtx.endShare(req)
    })
    reqCtx.set("req", req)
    next()
  }
}
reqCtx.createRouterMiddleware = function createRouterMiddleware() {
  return function (req, _res, next) {
    reqCtx.provide(req)
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

// now you can get contextual logger from anywhere you call reqCtx under async tree
const route = async ()=>{
  const reqLogger = reqCtx.get("logger")
  // the reqLogger is specific to the query
}

app.use(route)

```