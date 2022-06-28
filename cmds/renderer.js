const chalk = import("chalk")
import ora from 'ora'
import { build } from '../utils/builder/'
import { list: appsList } from '../utils/apps'
import cliSelect from 'cli-select'
import log from '../utils/log'

export async (args) => {
  log('Render template', { type: 'mainTitle' })
  console.log(args.source)
}
