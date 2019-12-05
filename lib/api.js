const body = require('body/json')
const send = require('send-data/json')

const createClient = require('../src/redis')
const client = createClient()

const REDIS_BUYERS_KEY = 'BUYERS'

module.exports = {
  addBuyer: addBuyer,
  retrieveBuyerDocument: retrieveBuyerDocument,
  routeTraffic: routeTraffic
}

// retrieve the document that belongs to the given id
function retrieveBuyerDocument (req, res, opts, cb) {
  const { params: { id: buyerId } } = opts
  // get buyer document from redis
  client.hget(REDIS_BUYERS_KEY, buyerId, function (err, offerString) {
    if (err) return cb(err)
    // redis data is in string format, parse to object
    const offer = JSON.parse(offerString)
    send(req, res, offer)
  })
}

// route request to the location of the highest value match
function routeTraffic (req, res, opts, cb) {
  // get all buyer documents from redis
  client.hgetall(REDIS_BUYERS_KEY, (err, obj) => {
    if (err) return cb(err)
    // get only the values, the keys are useful only for retrieving
    const allBuyersString = Object.values(obj)
    // convert the json strings to objects
    const allBuyers = allBuyersString.map(
      buyerString => JSON.parse(buyerString)
    )
    // retrieve the puery parameters
    const {
      timestamp,
      state: targetState,
      device:
      targetDevice
    } = opts.query
    // convert timestamp to hour and date
    const date = new Date(timestamp)
    const targetHour = date.getUTCHours()
    const targetDay = date.getUTCDay()
    // default highest matching, set to 0
    let highestValue = 0
    // helper function
    const isIn = (arr, e) => arr.indexOf(e) !== -1
    // get the location of the highest value matching offer
    const location = allBuyers.reduce((location, buyer) => {
      const { offers } = buyer
      // a buyer may have multiple offers, check through them all
      offers.forEach(offer => {
        const {
          location: currentLocation,
          value: currentValue,
          criteria: {
            device: allowedDevices,
            hour: allowedHours,
            day: allowedDays,
            state: allowedStates
          }
        } = offer
        // check for match
        const isMatch = isIn(allowedDevices, targetDevice) &&
          isIn(allowedStates, targetState) &&
          isIn(allowedHours, targetHour) &&
          isIn(allowedDays, targetDay)
        // the match needs to be of higher value than previous match
        if (isMatch && (currentValue > highestValue)) {
          location = currentLocation
          highestValue = currentValue
        }
      })
      return location
    }, '')
    // seind to a given location by setting the appropriate header
    send(req, res, { headers: { location }, statusCode: 302 })
  })
}

// add buyer document into redis
function addBuyer (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)
    // add buyer document into redis with the buyer id
    client.hset(REDIS_BUYERS_KEY, data.id, JSON.stringify(data), (err) => {
      if (err) return cb(err)
      send(req, res, { body: data, statusCode: 201 })
    })
  })
}
