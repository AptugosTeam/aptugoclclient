const chalk = import("chalk")
import ora from 'ora'
import prompt from 'prompt'
import getPrompt from 'util'.promisify(prompt.get).bind(prompt)
import cliSelect from 'cli-select'
import { list: structList, run: structRun } from '../utils/structures'
import { load } from '../utils/apps'
import log from '../utils/log'

export async (args) => {
  const fromcommandline = !!import.main
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
