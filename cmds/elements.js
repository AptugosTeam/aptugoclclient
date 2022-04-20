const chalk = require("chalk")
const ora = require('ora')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const { updateElement: update } = require('../utils/pages')
const log = require('../utils/log')
const readline = require('readline')

const updateElement = async(args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    const newdef = await update(def, args)
    r1.close()
    process.stdin.destroy()
    return def
  })
}

let output
module.exports = async (args) => {
  switch (args._[1]) {
    case 'update':
      output = await updateElement(args)
      break
    default:
      console.log(args)
      console.log('Unrecognized options for elements')
  }
  return output
}
