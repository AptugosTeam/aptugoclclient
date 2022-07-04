const chalk = import("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { list: appsList, load: appLoad } = require('../utils/apps')
const { run: structRun } = require('../utils/structures')
const { save } = require('../utils/apps')
const log = require('../utils/log')
const { state: loadState } = require('../utils/state')

export async (args) => {
  const state = await loadState()
  console.log( chalk.keyword('orange')('Creating a new Aptugo model') )

  if (!args.app) {
    log('\nSelect the application to create model into:', { type: 'promptHeader' })
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
    state.app = appLoad(appSelected.value)
  }

  // Model Name
  let modelname = args._[1]
  if (!args._[1]) {
    prompt.start()
    modelname = await getPrompt({
      name: 'name',
      validator: /^[0-9a-zA-Z\-]+$/,
      warning: 'Model must be only letters, numbers, or dashes'
    })
    modelname = modelname.name
  }

  const singleName = args._[2] ? args._[2] : `Single${modelname}`

  // Structure Run
  const result = await structRun('New Table', { state: state, Name: modelname, singleName } )
  save(result)
  console.log( chalk.bgKeyword('orange').black.bold('\n\nSuccessfuly created\n\n') )
}
