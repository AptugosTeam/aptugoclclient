const {
  list: structList,
  icon: structIcon,
  run: structRun
} = import('../utils/structures')

import { state: loadState } from '../utils/state'
import log from '../utils/log'
import { list: appsList, load: appLoad } from '../utils/apps'
import Table from 'cli-table'
import cliSelect from 'cli-select'
const chalk = import("chalk")
import { save } from '../utils/apps'

const list = async (args) => {
  const structs = await structList()
  if (args.raw) return structs

  let simpleList = []
  var table = new Table({
    head: ['Type', 'Name', 'Description']
  })

  structs.forEach(struct => {
    table.push([struct.type, struct.name, struct.desc || 'no description'])
    simpleList.push(struct.name)
  })
  if (args.extended) return table.toString()
  else return simpleList
}

const icon = async(args) => {
  const res = await structIcon(args.structure)
  return res
}

const run = async(args, extra) => {
  const state = await loadState()

  if (!args.skipapp) {
    if (!args.app) {
      log('\nSelect the application to create model into:', { type: 'promptHeader' })
      const apps = await appsList()
      appSelected = await cliSelect({
        values: apps,
        indentation: 2,
        cleanup: true,
        selected: '▹',
        unselected: '',
        valueRenderer: (value, selected) => {
          if (selected) {
            return chalk.underline(value.settings.name)
          } else {
            return `${value.settings.name}`
          }
        }
      })
      args.app = appSelected.value
      state.app = appLoad(appSelected.value)
    } else {
      if (state.app && state.app._id !== args.app) state.app = appLoad(args.app)
    }
  }

  Object.keys(args).forEach(key => {
    if (args[key] === 'willpaste') {
      args[key] = extra.file
    }
  })
  const result = await structRun(args.structure, { state: state, ...args } )
  state.app = result
  console.error('client: skipsaving', args)
  if (!args.skipsave) save(result || state.app)
  return await result
}

export async (args, extra) => {
  switch (args._[1]) {
    case 'list':
      return await list(args)
      break
    case 'icon':
      return await icon(args)
      break
    case 'run':
      return await run(args, extra)
      break
  }
}
