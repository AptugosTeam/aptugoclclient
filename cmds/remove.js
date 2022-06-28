const chalk = import("chalk")
import ora from 'ora'
import prompt from 'prompt'
import getPrompt from 'util'.promisify(prompt.get).bind(prompt)
import cliSelect from 'cli-select'
import { list: appsList } from '../utils/apps'
import { remove } from '../utils/apps'
import log from '../utils/log'

export async (args) => {
  log('Remove Application', { type: 'mainTitle' })

  // App Template
  log('\nSelect the application to remove:', { type: 'promptHeader' })
  const apps = await appsList()
  let appSelected = await cliSelect({
    values: apps,
    cleanup: false,
    valueRenderer: (value, selected) => {
      return `${value.settings.name}`
    },
  }).catch(e => {
    log('User exit', { type: 'error', exit: true })
  })

  // Confirmation
  prompt.start()
  appname = await getPrompt({
    description: `Are you sure you wish to delete, erase, remove ${appSelected.value.settings.name} (YES/NO)`,
    name: 'confirm',
    importd: true,
    validator: /YES|NO/,
    warning: 'You must type YES or CTRL+C buddy',
  })

  if (appname.confirm === 'YES') {
    console.log('Application removed')
    remove(appSelected.value)
  } else {
    log('Your application survived', { type: 'error', exit: true })
  }
}
