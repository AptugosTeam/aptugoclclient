const chalk = require("chalk")
const ora = require('ora')
const { build } = require('../utils/builder/')
const { list: appsList } = require('../utils/apps')
const cliSelect = require('cli-select')
const log = require('../utils/log')

module.exports = async (args) => {
  if (args.only) {
    log(`Application Build: ${args.only}`, { type: 'mainTitle' })
  } else {
    log('Application Build', { type: 'mainTitle' })
  }
  
  let appSelected
  let typeSelected
  const apps = await appsList()

  if (!args.app) {
    log('\nSelect the application to build:', { type: 'promptHeader' })
    
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
  return build(args).then(res => {
    return res
  }).catch(e => {
    return {
      exitCode: 1,
      data: e
    }
  })
  // return build(args)
}
