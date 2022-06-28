import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { get } from './config'
import { list: appsList } from './apps'
import { getTree } from './files'
import { exit } from 'process'

export {
  fileSource: (appFolder, filePath) => {
    const appFolders = get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return assetPath
  },
  fileRead: (appFolder, filePath) => {
    const appFolders = get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return fs.readFileSync(assetPath, { encoding: 'utf-8'})
  },
  setfile: async (args, fileDefinition) => {
    const appFolders = get('folders').applications
    const apps = await appsList()
    const app = apps.filter(localapp => (localapp.settings.name === args.app) || (localapp._id === args.app))[0]
    const assets = JSON.parse( fs.readFileSync( path.join( appFolders, aptugocli.friendly(app.settings.name), 'assets.json' ), { encoding: 'utf8'}, true) )
    let foundAsset = assets.filter(asset => asset.id === args.id)
    let currentAsset = foundAsset.length ? foundAsset[0] : {
      name: args.filename,
      id: args.id,
      type: 'stylesheet'
    }

    const saveFolder = path.join(appFolders, aptugocli.friendly(app.settings.name), 'Drops')
    console.log('assets setfile', args, path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`), args.binary, fileDefinition)
    aptugocli.createIfDoesntExists(saveFolder)
    if (args.binary) fs.writeFileSync(path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`), fileDefinition)
    else fs.writeFileSync(path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`), JSON.parse(fileDefinition))
    console.log('saving asset', path.join(saveFolder, `${currentAsset.id}_${currentAsset.name}`) )
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
