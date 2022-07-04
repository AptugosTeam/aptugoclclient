const readline = require('readline')
const { load: appload } = require('../utils/apps')
const { state: loadState } = require('../utils/state.js')
const assets = require('../utils/assets.js')
const theapps = require('../utils/apps.js')

const fixArgApp = async (args) => {
  if (!args.app) {
    log('\nSelect the application containing the Asset:', { type: 'promptHeader' })
    const apps = await theapps.list()
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
  } else if (typeof args.app === 'string') {
    const state = await loadState()
    if (args.app === state.app._id) {
      args.app = state.app
    } else {
      const apps = await theapps.list()
      args.app = apps.filter(localapp => localapp.settings.name === args.app || localapp._id === args.app)[0]
    }
  }
  return args
}

const assetRemove = async (args) => {
  args = await fixArgApp(args)
  return assets.remove(args)
}

const assetDetails = async (args) => {
  return assets.details(args)
}

const assetNewVersion = async (args) => {
  args = await fixArgApp(args)
  return assets.newVersion(args)
}

const assetRemoveVersion = async (args) => {
  args = await fixArgApp(args)
  return assets.removeVersion(args)
}

const filepath = async (args) => {
  const app = await appload(args.app)
  return assets.fileSource(app.folder, args.asset)
}

const filesource = async (args) => {
  return assets.fileSource(args.app, args.asset)
}

const fileRead = async (args) => {
  return assets.fileRead(args.app, args.asset)
}

const setfile = async (args, extraarguments = null) => {
  let newdef
  if (extraarguments && extraarguments.file) {
    newdef = await assets.setfile(args, extraarguments.file)
  } else {
    var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
    r1.question('Paste definition here\n', function (def) {
      newdef = file(args, def)
      r1.close()
      process.stdin.destroy()
    })
  }
  console.log('newdef', newdef)
  return newdef
}

let output
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'remove':
      output = await assetRemove(args)
      break
    case 'removeversion':
      output = await assetRemoveVersion(args)
      break
    case 'newversion':
      output = await assetNewVersion(args)
      break
    case 'details':
      output = await assetDetails(args)
      break
    case 'path':
      output = await filepath(args)
      break
    case 'load':
      output = await filesource(args)
      break
    case 'read':
        output = await fileRead(args)
        break
    case 'setfile':
      output = setfile(args, extraarguments)
      break
    case 'upload':
      output = upload(args)
      break
  }
  return output
}
