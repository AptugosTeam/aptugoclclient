const log = require('../utils/log')

module.exports = {
  run: async ({ app }) => {
    console.log(app)
    log(`Running ${app.settings.name}`, { type: 'mainTitle' })
  }
}
