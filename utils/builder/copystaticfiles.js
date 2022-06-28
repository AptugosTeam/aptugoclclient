import fs from 'fs'
import path from 'path'
import templates from '../templates.js'
const fsLoadAndParseFile = templates.fsLoadAndParseFile
import twig from 'twig/twig.js'
import log from '../log.js'
import error from '../error.js'
import twigRender from './twigRender.js'
import { isBinary } from 'istextorbinary'
import config from '../config.js'

export default (parameters) => {
  const doCopyStaticFiles = (parameters) => {
    return new Promise((resolve,reject) => {
      parameters.files.forEach(prefile => {
        let skip = false
        if (prefile.path === 'elements' || prefile.path === 'Fields' || prefile.path === 'templatescripts') skip = true

        if (!skip) {
          let fileName = prefile.path
          let partialPath = path.join(parameters.accumulated || '', fileName )
          let sourcePath = path.join( config.get('folders').templates ,aptugocli.activeParameters.template._id, partialPath )
          let fullPathWithoutFile = prefile.fullPathWithoutFile || path.join(parameters.fullbuildfolder, parameters.buildFolder, parameters.accumulated || '')
          let fullPath = prefile.fullPath || path.join(parameters.fullbuildfolder, parameters.buildFolder, partialPath)


          if ( isBinary(sourcePath) ) {
            log(`Copying binary file: ${fullPath}`, { type: 'advance', level: parameters.level, verbosity: 7 })
            fs.copyFileSync( sourcePath, fullPath )
          } else {
            let [postfile,fs] = fsLoadAndParseFile({ unique_id: prefile.unique_id })
            const file = { ...prefile, ...postfile }
            aptugocli.currentFile = {
              ...file,
              fullPath: fullPath,
              fullPathWithoutFile: fullPathWithoutFile
            }

            if (file.modelRelated) {
              for (var table in parameters.application.tables) {
                if (file.subtype === 'Any' || (file.subtype === parameters.application.tables[table].subtype)) {
                  let calculatedFilename = twig.twig({ data: path.join(file.path) })
                  let modelfileName = calculatedFilename.render({ table: parameters.application.tables[table] })
                  let modelPartialPath = path.join(parameters.accumulated || '', modelfileName )
                  fullPath = prefile.fullPathWithoutFile ? path.join(prefile.fullPathWithoutFile, modelfileName): path.join(parameters.fullbuildfolder, parameters.buildFolder, modelPartialPath)
                  aptugocli.currentFile = {
                    ...file,
                    fullPath: fullPath,
                    fullPathWithoutFile: fullPathWithoutFile
                  }
                  parameters.table = parameters.application.tables[table]

                  if (file.type === 'folder') {
                    aptugocli.createIfDoesntExists(fullPath)
                    if (file.children && file.children.length) {
                      doCopyStaticFiles({
                        ...parameters,
                        level: parameters.level + 1,
                        files: [...file.children]
                      })
                    }
                  } else {
                    log(`Copying model file: ${fullPath}`, { type: 'advance', level: parameters.level, verbosity: 7 })
                    try {
                      var contents = twigRender({ data: fs || ''}, parameters)
                      aptugocli.writeFile( fullPath, contents, true )
                    } catch(e) {
                      console.error('Error compiling template for file: ', fileName, e)
                    }
                  }
                }
              }
            } else if (file.type === 'folder') {
              aptugocli.createIfDoesntExists(fullPath)
              log(`Creating folder: ${fullPath} ${parameters.level}`, { type: 'advance', level: parameters.level, verbosity: 7 })
              if (file.children && file.children.length) {
                doCopyStaticFiles({
                  ...parameters,
                  files: [...file.children],
                  accumulated: partialPath,
                  level: parameters.level + 1
                })
              }
            } else {
              try {
                var contents = twigRender({ data: fs || ''}, parameters)
                log(`Copying static file: ${fullPath}`, { type: 'advance', level: parameters.level, verbosity: 7 })
                aptugocli.writeFile( fullPath, contents, true )
              } catch(e) {
                error('Error compiling template for file: ', fileName, e)
              }
            }
          }
        }
      })
      resolve()
    })
  }
  return doCopyStaticFiles({ ...parameters, level: 0, files: parameters.files || parameters.template.files }).then(res => {
    return 'ok'
  })
}
