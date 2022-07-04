const pkg = require('../package.json')

module.exports = (args) => {
  return `v${pkg.version}`
}
