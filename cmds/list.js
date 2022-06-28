import { list: appsList } from '../utils/apps'
import prompt from 'prompt'
import getPrompt from 'util'.promisify(prompt.get).bind(prompt)
import cliSelect from 'cli-select'
import log from '../utils/log'

export async (args) => {
  log('Listing Aptugo applications', { type: 'mainTitle' })

  const output = await appsList()
  return output
}
