const structures = require('../utils/structures.js').structures
const { state: loadState } = require('../utils/state.js')
const log = require('../utils/log.js')
const apps = require('../utils/apps.js')
const Table = require('cli-table')
const cliSelect = require('cli-select')
const chalk = import("chalk")
// const apps, { save } = require('../utils/apps')

const list = async (args) => {
  const structs = await structures.list()
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
  const res = await structures.icon(args.structure)
  return res
}

const run = async(args, extra) => {
  const state = await loadState()
  if (!args.skipapp) {
    if (!args.app) {
      log('\nSelect the application to create model into:', { type: 'promptHeader' })
      const allapps = await apps.list()
      appSelected = await cliSelect({
        values: allapps,
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
      state.app = apps.load(appSelected.value)
    } else {
      if (state.app && state.app._id !== args.app) state.app = apps.load(args.app)
    }
  }

  Object.keys(args).forEach(key => {
    if (args[key] === 'willpaste') {
      args[key] = extra.file
    }
  })

  const result = await structures.run(args.structure, { state: state, ...args } )
  state.app = result
  if (!args.skipsave) apps.save(result || state.app)
  return await result
}

module.exports = async (args, extra) => {
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
