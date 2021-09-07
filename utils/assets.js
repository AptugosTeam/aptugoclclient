const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { get } = require('./config')
const { getTree } = require('./files')
const { exit } = require('process')

module.exports = {
  fileSource: (appFolder, filePath) => {
    const appFolders = get('folders').applications
    const assetPath = path.join(appFolders, appFolder, 'Drops', filePath)
    return assetPath
  }
}
