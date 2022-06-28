const chalk = import("chalk")
import ora from 'ora'
import prompt from 'prompt'
import getPrompt from 'util'.promisify(prompt.get).bind(prompt)
import cliSelect from 'cli-select'
import { updateElement: update } from '../utils/pages'
import log from '../utils/log'
import readline from 'readline'

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
export async (args) => {
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
