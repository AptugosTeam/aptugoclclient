const log = require('./log')
module.exports = (message, exit) => {
  log(message, { type: 'error' })
  throw new Error(message)
}
