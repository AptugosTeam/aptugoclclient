import chalk from 'chalk'
import builder from '../utils/builder/index.js'
import theapps from '../utils/apps.js'
import { state as loadState } from '../utils/state.js'
import cliSelect from 'cli-select'
import log from '../utils/log.js'

export default async (args) => {
  const state = await loadState()
  if (args.only) {
    log(`Application Build: ${args.only}`, { type: 'mainTitle' })
  } else {
    log('Application Build', { type: 'mainTitle' })
  }

  let appSelected
  let typeSelected

  if (!args.app) {
    log('\nSelect the application to build:', { type: 'promptHeader' })
    const apps = await theapps.list()
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
  } else if (typeof args.app === 'string') {
    if (args.app === state.app._id) {
      args.app = state.app
    } else {
      const apps = await theapps.list()
      args.app = apps.filter(localapp => localapp.settings.name === args.app || localapp._id === args.app)[0]
    }
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

  return builder.build(args).then(res => {
    return res
  }).catch(e => {
    const theError = e.exitCode ? e : { exitCode: 1, message: 'Mariscal Error', error: e }
    return theError
  })
}
