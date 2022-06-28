import util from 'util'
import prompt from 'prompt'
import structures from '../utils/structures.js'
import thebuilder from './build.js'

const getPrompt = util.promisify(prompt.get).bind(prompt)

const chalk = import("chalk")
import ora from 'ora'

import cliSelect from 'cli-select'

import apps from '../utils/apps.js'
import log from '../utils/log.js'

export default async (args) => {
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
    const structs = await structures.list()
    const templateStructs = structs.filter(struct => struct.type === 'template')
    apptemplate = await cliSelect({
      values: templateStructs,
      cleanup: false,
      valueRenderer: (value, selected) => {
        return `${value.name} - ${value.desc}`
      },
    })
  } else {
    const structs = await structures.list()
    const templateStructs = structs.filter(struct => struct._id === String(args.template))
    apptemplate.value = templateStructs[0]
  }

  // Structure Run
  const result = await structures.run(apptemplate.value, { Name: appname } )
  apps.save(result)
  log('Successfuly created')

  // Build App
  if (!args.nobuild) {
    var output = await thebuilder({
      app: result,
      type: 'Development'
    })
  }

  return output || result
}
