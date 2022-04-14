const { 
  list: structList,
  icon: structIcon,
  run: structRun
} = require('../utils/structures')
const { state: loadState } = require('../utils/state')
const log = require('../utils/log')
const { list: appsList, load: appLoad } = require('../utils/apps')
const Table = require('cli-table')
const cliSelect = require('cli-select')
const chalk = require("chalk")
const { save } = require('../utils/apps')

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

const run = async(args) => {
  const state = await loadState()

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
    state.app = appLoad(args.app)
  }

  const result = await structRun(args.structure, { state: state, ...args } )
  save(state.app)
  return result || state.app
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'list':
      return await list(args)
      break
    case 'icon':
      return await icon(args)
      break
    case 'run':
      return await run(args)
      break
  }
}
