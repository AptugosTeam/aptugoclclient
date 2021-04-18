const chalk = require("chalk")

module.exports = (message, exit) => {
  console.log( chalk.red.bold(message) )
  exit && process.exit(1)
}
