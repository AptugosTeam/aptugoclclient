const chalk = require("chalk")
const ora = require('ora')
const { build } = require('../utils/builder/')
const { list: appsList } = require('../utils/apps')
const cliSelect = require('cli-select')
const log = require('../utils/log')

module.exports = async (args) => {
  log('Application Build', { type: 'mainTitle' })
  let appSelected
  let typeSelected
  if (!args.app) {
    log('\nSelect the application to build:', { type: 'promptHeader' })
    const apps = await appsList()
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
  }

  if (!args.type) {
    log('\nSelect the build method:', { type: 'promptHeader' })
    typeSelected = await cliSelect({
      values: ['Development','Stagging','Production'],
      cleanup: true,
      indentation: 2,
      selected: '▹',
      unselected: '',
      valueRenderer: (value, selected) => {
        if (selected) {
          return chalk.underline(value)
        } else {
          return value
        }
      }
    })

    args.type = typeSelected.value
  }

  if (args.clean) {
    args.clean = args.clean === 'false' ? false : true
  }

  if (args.skip) {
    args.skip = args.skip.split(',')
  }
  build(args)
}