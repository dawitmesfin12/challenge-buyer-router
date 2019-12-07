const body = require('body/json')
const send = require('send-data/json')

const Buyer = require('./models/buyer')

module.exports = {
  addBuyer: addBuyer,
  retrieveBuyerDocument: retrieveBuyerDocument,
  routeTraffic: routeTraffic
}

// retrieve the document that belongs to the given id
function retrieveBuyerDocument (req, res, opts, cb) {
  // extract buyer id from the query param
  const { params: { id: buyerId } } = opts
  Buyer.getBuyer(buyerId, function (err, buyer) {
    if (err) return cb(err)
    send(req, res, buyer)
  })
}

// route request to the location of the highest value match
function routeTraffic (req, res, opts, cb) {
  // get all buyer documents from redis
  Buyer.getAllBuyers((err, allBuyers) => {
    if (err) return cb(err)
    // retrieve the query parameters
    const { timestamp, state: targetState, device: targetDevice } = opts.query
    // convert time stamp to hour and date
    const date = new Date(timestamp)
    const targetHour = date.getUTCHours()
    const targetDay = date.getUTCDay()
    const location = getHighestValuedLocation(
      allBuyers, { targetDay, targetHour, targetState, targetDevice })
    // send to a given location by setting the appropriate header
    send(req, res, { headers: { location }, statusCode: 302 })
  })
}

// add buyer document into redis
function addBuyer (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)
    // add buyer document into redis with the buyer id
    Buyer.addBuyer(data, (err) => {
      if (err) return cb(err)
      send(req, res, { body: data, statusCode: 201 })
    })
  })
}

// gets the highest valued matching location.
function getHighestValuedLocation (allBuyers, criteria) {
  const { targetDay, targetHour, targetState, targetDevice } = criteria
  // default highes matching value, set to 0
  let highestValue = 0
  // get the location of the highest value matching offer
  return allBuyers.reduce((location, buyer) => {
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
      const isMatch = allowedDevices.includes(targetDevice) &&
        allowedStates.includes(targetState) &&
        allowedHours.includes(targetHour) &&
        allowedDays.includes(targetDay)
      // the match needs to be of higher value than previous match
      if (isMatch && (currentValue > highestValue)) {
        location = currentLocation
        highestValue = currentValue
      }
    })
    return location
  }, '')
}
