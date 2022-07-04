const chalk = import("chalk")
const controller = require('../utils/controller.js')
const cliSelect = require('cli-select')
const log = require('../utils/log.js')
const os = require('os')
const apps = require('../utils/apps.js')

const run = async (args) => {
  log('Application Run', { type: 'mainTitle' })
  let appSelected
  const allapps = await apps.list()

  if (!args.app) {
    log('\nSelect the application to run:', { type: 'promptHeader' })

    appSelected = await cliSelect({
      values: allapps,
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
    args.app = allapps.filter(localapp => localapp.settings.name === args.app || localapp._id === args.app)[0]
  }

  return controller.run(args).then(res => {
    return res
  }).catch(e => {
    return e
  })
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'status':
      return await controller.isRunning()
      break
    case 'tmpdir':
      return os.tmpdir()
      break
    case 'run':
      return await run(args)
      break
    case 'stop':
      return await controller.stop()
      break
  }
}

