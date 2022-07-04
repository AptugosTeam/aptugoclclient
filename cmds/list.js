const apps = require('../utils/apps.js')
const log = require('../utils/log.js')

module.exports = async (args) => {
  log('Listing Aptugo applications', { type: 'mainTitle' })

  const output = await apps.list()
  return output
}
