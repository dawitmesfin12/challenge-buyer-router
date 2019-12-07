const createClient = require('../../src/redis')
const client = createClient()

const REDIS_BUYERS_KEY = 'BUYERS'

function getBuyer (buyerId, cb) {
  // get buyer document from redis
  client.hget(REDIS_BUYERS_KEY, buyerId, function (err, buyerString) {
    if (err) return cb(err)
    // redis data is in string format, parse to object
    const buyer = JSON.parse(buyerString)
    cb(err, buyer)
  })
}

function getAllBuyers (cb) {
  // get all buyer documents from redis
  client.hgetall(REDIS_BUYERS_KEY, (err, obj) => {
    if (err) return cb(err)
    // get only the values, the keys are useful only for retrieving
    const allBuyersString = Object.values(obj)
    // convert the json strings to objects
    const allBuyers = allBuyersString.map(
      buyerString => JSON.parse(buyerString)
    )
    cb(err, allBuyers)
  })
}

function addBuyer (data, cb) {
  // add buyer document into redis with the buyer id
  client.hset(REDIS_BUYERS_KEY, data.id, JSON.stringify(data), (err) => {
    cb(err)
  })
}

module.exports = {
  getBuyer: getBuyer,
  getAllBuyers: getAllBuyers,
  addBuyer: addBuyer
}
