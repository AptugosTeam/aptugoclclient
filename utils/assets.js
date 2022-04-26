const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { get } = require('./config')
const { list: appsList } = require('./apps')
const { getTree } = require('./files')
const { exit } = require('process')

module.exports = {
  fileSource: (appFolder, filePath) => {
    const appFolders = get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return assetPath
  },
  setfile: async (args, fileDefinition) => {
    const appFolders = get('folders').applications
    const apps = await appsList()
    const app = apps.filter(localapp => localapp.settings.name === args.app)[0]
    const assets = JSON.parse( fs.readFileSync( path.join( appFolders, aptugocli.friendly(app.settings.name), 'assets.json' ), { encoding: 'utf8'}, true) )
    let foundAsset = assets.filter(asset => asset.id === args.id)
    let currentAsset = foundAsset.length ? foundAsset[0] : {
      name: args.filename,
      id: args.id,
      type: 'stylesheet'
    }
    
    const saveFolder = path.join(appFolders, aptugocli.friendly(app.settings.name), 'Drops')
    aptugocli.createIfDoesntExists(saveFolder)
    fs.writeFileSync(path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`), JSON.parse(fileDefinition))
    return path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`)
  },
  upload: async (args) => {
    const appFolders = get('folders').applications
    const apps = await appsList()
    const app = apps.filter(localapp => localapp.settings.name === args.app || localapp._id === args.app)[0]
    const assets = JSON.parse( fs.readFileSync( path.join( appFolders, aptugocli.friendly(app.settings.name), 'assets.json' ), { encoding: 'utf8'}, true) )
    let foundAsset = assets.filter(asset => asset.id === args.id)
    let currentAsset = foundAsset.length ? foundAsset[0] : {
      name: args.filename,
      id: args.id,
      type: 'image'
    }
    const saveFolder = path.join(appFolders, aptugocli.friendly(app.settings.name), 'Drops')
    aptugocli.createIfDoesntExists(saveFolder)
    
    return 'Upload Location:' + path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`)
  }
}
