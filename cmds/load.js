const chalk = require('chalk')
const theapps = require('../utils/apps.js')
const cliSelect = require('cli-select')
const log = require('../utils/log.js')

module.exports = async (args) => {
  log('Loading Aptugo application', { type: 'mainTitle' })

  if (!args.app && !args._[1]) {
    log('\nSelect the application to load:', { type: 'promptHeader' })
    const apps = await theapps.list()
    const appSelected = await cliSelect({
      values: apps,
      indentation: 2,
      cleanup: true,
      selected: '▹',
      unselected: '',
      valueRenderer: (value, selected) => {
        if (selected) {
          return chalk.underline(value.settings.name)
        } else {
          return `${value.settings.name}`
        }
      }
    })
    args.app = appSelected.value
  } else if (args._[1]) {
    args.app = args._[1]
  }

  return theapps.load(args.app)
}
