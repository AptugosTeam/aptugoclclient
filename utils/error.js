const chalk = require("chalk")
const builder = require('./builder/index')
module.exports = (message, exit) => {
  console.log( chalk.red.bold(message) )
  aptugo.setFeedback(message, true)
  throw new Error(message)
}
