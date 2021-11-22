const chalk = require("chalk")
const { run: runApp } = require('../utils/controller')
const { list: appsList } = require('../utils/apps')
const cliSelect = require('cli-select')
const log = require('../utils/log')

const run = async (args) => {
  log('Application Run', { type: 'mainTitle' })
  let appSelected
  const apps = await appsList()

  if (!args.app) {
    log('\nSelect the application to run:', { type: 'promptHeader' })
    
    appSelected = await cliSelect({
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
  } else {
    args.app = apps.filter(localapp => localapp.settings.name === args.app)[0]
  }
  
  return runApp(args).then(res => {
    return res
  })
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'run':
      return await run(args)
      break
  }
}

