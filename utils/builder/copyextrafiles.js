import fs from 'fs'
import path from 'path'
import templates from '../templates.js'
const fsLoadAndParseFile = templates.fsLoadAndParseFile
import log from '../log.js'
import twigRender from './twigRender.js'
import { isBinary } from 'istextorbinary'
import config from '../config.js'

export default (parameters) => {
  doCopyExtraFiles = (parameters) => {
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
