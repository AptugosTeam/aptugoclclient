const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const config = require('./config')
const { list: appsList } = require('./apps')
const { getTree } = require('./files')
const { exit } = require('process')
const sizeOf = require('image-size')
const sharp = require('sharp')
const assetsModule = {
  remove: (args) => {
    const appFolders = config.get('folders').applications
    const appFolder =  path.join( appFolders, aptugocli.friendly(args.app.settings.name) )
    const assetPath = path.join( appFolder, 'Drops', args.asset)
    fs.unlinkSync(assetPath)
    // TODO: Remove versions as well
  },
  newVersion: (args) => {
    return new Promise((resolve,reject) => {
      const appFolders = config.get('folders').applications
      const appFolder =  path.join( appFolders, aptugocli.friendly(args.app.settings.name) )
      const assetPath = path.join( appFolder, 'Drops', args.asset)
      sharp(assetPath)
        .resize({ width: Number(args.width), height: Number(args.height) })
        .toFile( path.join( appFolder, 'Drops', `${args.id}_${args.name}`))
        .then(info => {
          resolve(info)
        })
        .catch(err => {
          reject(err)
        })
    })
  },
  removeVersion: (args) => {
    const appFolders = config.get('folders').applications
    const appFolder =  path.join( appFolders, aptugocli.friendly(args.app.settings.name) )
    const assetPath = path.join( appFolder, 'Drops', args.asset)
    fs.unlinkSync(assetPath)
    return 'ok'
  },
  details: (args) => {
    const appFolders = config.get('folders').applications
    const appFolder =  path.join( appFolders, aptugocli.friendly(args.app.settings.name) )
    const assetPath = path.join( appFolder, 'Drops', args.asset)
    const imageSize = sizeOf(assetPath)
    return {
      width: imageSize.width,
      height: imageSize.height,
      size: fs.statSync( assetPath ).size,
      versions: []
    }
  },
  fileSource: (appFolder, filePath) => {
    const appFolders = config.get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return assetPath
  },
  fileRead: (appFolder, filePath) => {
    const appFolders = config.get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return fs.readFileSync(assetPath, { encoding: 'utf-8'})
  },
  setfile: async (args, fileDefinition) => {
    console.log('setfile args', args)
    const appFolders = config.get('folders').applications
    const apps = await appsList()
    const app = apps.filter(localapp => (localapp.settings.name === args.app) || (localapp._id === args.app))[0]
    const assets = JSON.parse( fs.readFileSync( path.join( appFolders, aptugocli.friendly(app.settings.name), 'assets.json' ), { encoding: 'utf8'}, true) )
    let foundAsset = assets.filter(asset => asset.id === args.id)
    let currentAsset = foundAsset.length ? foundAsset[0] : {
      name: args.filename || args.details?.name,
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
    const appFolders = config.get('folders').applications
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

module.exports = assetsModule
