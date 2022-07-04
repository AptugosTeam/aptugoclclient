const fs = require('fs')
const path = require('path')
const templates = require('../templates.js')
const fsLoadAndParseFile = templates.fsLoadAndParseFile
const log = require('../log.js')
const twigRender = require('./twigRender.js')
const { isBinary } = require('istextorbinary')
const config = require('../config.js')

module.exports = (parameters) => {
  const doCopyExtraFiles = (parameters) => {
    parameters.files.forEach(prefile => {
      let sourceFileName = prefile.source
      let destinationFileName = prefile.destination
      let sourcePath = path.join( config.get('folders').templates, aptugocli.activeParameters.template._id, sourceFileName )
      let destinationPath = path.join( parameters.fullbuildfolder, parameters.buildFolder, destinationFileName )

      aptugocli.createIfDoesntExists(destinationPath.substring(0,destinationPath.lastIndexOf('/')))
      if ( isBinary(sourcePath) ) {
        log(`Copying extra binary file: ${sourceFileName}`, { type: 'advance', level: parameters.level, verbosity: 6 })
        fs.copyFileSync( sourcePath, destinationPath )
      } else {
        log(`Copying extra file: ${sourceFileName}`, { type: 'advance', level: parameters.level, verbosity: 6 })
        const fileSrc = fsLoadAndParseFile({ file: { completePath: sourcePath, path: '' }})
        var contents = twigRender({ data: fileSrc[1] || ''}, prefile)
        aptugocli.writeFile( destinationPath, contents, true )
      }
    })
  }
  doCopyExtraFiles(parameters)
}
