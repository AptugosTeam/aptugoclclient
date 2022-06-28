const chalk = import("chalk")
import ora from 'ora'
import prompt from 'prompt'
import getPrompt from 'util'.promisify(prompt.get).bind(prompt)
import cliSelect from 'cli-select'
import { list: structList, run: structRun } from '../utils/structures'
import { save } from '../utils/apps'
import log from '../utils/log'
import readline from 'readline'

const updateApp = async(args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    console.log('def', def)
    const newdef = await save( JSON.parse(def) )
    r1.close()
    process.stdin.destroy()
    return def
  })
}


export async (args, extra) => {
  const fromcommandline = !!import.main
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

  if (extra.file) {
    await save( extra.file )
  } else {
    await updateApp(args)
  }
  return 'ok'
}
