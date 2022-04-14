const chalk = require("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { list: structList, run: structRun } = require('../utils/structures')
const { save } = require('../utils/apps')
const log = require('../utils/log')

module.exports = async (args) => {
  const fromcommandline = !!require.main
  log('Creating a new Aptugo application', { type: 'mainTitle' })
  
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
  let apptemplate = {}
  if (!args.template) {
    log('Select the template to use:', { type: 'promptHeader'})
    const structs = await structList()
    const templateStructs = structs.filter(struct => struct.type === 'template')
    apptemplate = await cliSelect({
      values: templateStructs,
      cleanup: false,
      valueRenderer: (value, selected) => {
        return `${value.name} - ${value.desc}`
      },
    })
  } else {
    const structs = await structList()
    const templateStructs = structs.filter(struct => struct._id === String(args.template))
    apptemplate.value = templateStructs[0]
  }
  
  // Structure Run
  const result = await structRun(apptemplate.value, { Name: appname } )
  save(result)
  log('Successfuly created')

  // Build App
  if (!args.nobuild) {
    const thebuilder = require('./build')
    var output = await thebuilder({
      app: result,
      type: 'Development'
    })
  }

  return output || result
}
