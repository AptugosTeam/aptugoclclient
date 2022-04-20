const chalk = require("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { list: structList, run: structRun } = require('../utils/structures')
const { load } = require('../utils/apps')
const log = require('../utils/log')

module.exports = async (args) => {
  const fromcommandline = !!require.main
  log('Loading Aptugo application', { type: 'mainTitle' })
  
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

  const output = load(appname)
  return output
}
