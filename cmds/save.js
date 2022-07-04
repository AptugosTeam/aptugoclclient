const chalk = import("chalk")
const theapps = require('../utils/apps.js')
const log = require('../utils/log.js')
const readline = require('readline')

const updateApp = async(args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    const newdef = await theapps.save( JSON.parse(def) )
    r1.close()
    process.stdin.destroy()
    return def
  })
}


module.exports = async (args, extra) => {
  log('Saving an existing Aptugo application', { type: 'mainTitle' })

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

  if (extra.file) {
    await theapps.save( extra.file )
  } else {
    await updateApp(args)
  }
  return 'ok'
}
