const chalk = require("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { list: structList, run: structRun } = require('../utils/structures')
const { save } = require('../utils/apps')
const log = require('../utils/log')
const readline = require('readline')

const updateApp = async(args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    const newdef = await save( JSON.parse(def) )
    r1.close()
    process.stdin.destroy()
    return def
  })
}


module.exports = async (args) => {
  const fromcommandline = !!require.main
  log('Saving an existing Aptugo application', { type: 'mainTitle' })

  // App Name
  let appnameorid = args.app
  if (!args.app) {
    prompt.start()
    appname = await getPrompt({
      name: 'name',
      validator: /^[0-9a-zA-Z\-]+$/,
      warning: 'Application must be only letters, numbers, or dashes'
    })
    appnameorid = appname.name
  }

  await updateApp(args)
  return 'ok'
}
