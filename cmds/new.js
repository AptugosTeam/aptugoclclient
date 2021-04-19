const chalk = require("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { list: structList, run: structRun } = require('../utils/structures')
const { save } = require('../utils/apps')

module.exports = async (args) => {
  console.log( chalk.keyword('orange')('Creating a new Aptugo application') )

  // App Name
  let appname = args._[1]
  if (!args._[1]) {
    prompt.start()
    appname = await getPrompt({
      name: 'name',
      validator: /^[0-9a-zA-Z\-]+$/,
      warning: 'Application must be only letters, numbers, or dashes'
    })
    appname = appname.name
  }

  // App Template
  console.log( chalk.keyword('orange')('\nSelect the template to use:') )
  const structs = await structList()
  const templateStructs = structs.filter(struct => struct.type === 'template')
  let apptemplate = await cliSelect({
    values: templateStructs,
    cleanup: false,
    valueRenderer: (value, selected) => {
      return `${value.name} - ${value.desc}`
    },
  })

  // Structure Run
  const result = await structRun(apptemplate.value, { Name: appname } )
  save(result)
  console.log( chalk.bgKeyword('orange').black.bold('\n\nSuccessfuly created\n\n') )
  
  // Build App
  require('./build')({ app: result, type: 'Development' })
}
