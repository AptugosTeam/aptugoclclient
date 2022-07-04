const log = require('./log.js')
module.exports = (message, exit) => {
  log(message, { type: 'error' })
  throw new Error(message)
}
