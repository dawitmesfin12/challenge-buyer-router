const URL = require('url')
const http = require('http')
const HttpHashRouter = require('http-hash-router')
const sendJson = require('send-data/json')

// import api
const api = require('./api')

// this will handle the routing
const router = HttpHashRouter()

// set the routes, and their methods
router.set('/buyers', { POST: api.addBuyer })
router.set('/buyers/:id', { GET: api.retrieveBuyerDocument })
router.set('/route', { GET: api.routeTraffic })

// create the server passing, and pass the handler
module.exports = function createServer () {
  return http.createServer(handler)
}

// the handler should forward request to the router
function handler (req, res) {
  router(req, res,
    {
      query: getQuery(req.url)
    },
    onError.bind(null, req, res)

  )
}

// callback to handle errors
function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

// log errors
function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  const logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

// define query parser for the router
function getQuery (url) {
  return URL.parse(url, true).query
}
