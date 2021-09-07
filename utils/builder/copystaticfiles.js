const fs = require('fs')
const path = require('path')
const { fsLoadAndParseFile } = require('../templates')
const twig = require('twig/twig.js')
const log = require('../log')
const error = require('../error')
const twigRender = require('./twigRender')

module.exports = (parameters) => {
  doCopyStaticFiles = (parameters) => {
    parameters.files.forEach(prefile => {
      let skip = false
      if (prefile.path === 'elements') skip = true

      if (!skip) {
        let fileName = prefile.path
        let partialPath = path.join(parameters.accumulated || '', fileName )
        let fullPath = prefile.fullPath || path.join(parameters.fullbuildfolder, parameters.buildFolder, partialPath)
        let [postfile,fs] = fsLoadAndParseFile({ unique_id: prefile.unique_id })
        const file = { ...prefile, ...postfile }
        aptugo.currentFile = {
          ...file,
          fullPath: fullPath
        }

        if (file.modelRelated) {
          for (var table in parameters.application.tables) {
            if (file.subtype === 'Any' || (file.subtype === parameters.application.tables[table].subtype)) {
              let calculatedFilename = twig.twig({ data: path.join(parameters.accumulated || '', file.path ) })
              let modelfileName = calculatedFilename.render({ table: parameters.application.tables[table] })
              let modelPartialPath = path.join(parameters.accumulated || '', modelfileName )
              fullPath = path.join(parameters.fullbuildfolder, parameters.buildFolder, modelfileName)
              aptugo.currentFile = {
                ...file,
                fullPath: fullPath
              }
              parameters.table = parameters.application.tables[table]

              if (file.type === 'folder') {
                aptugo.createIfDoesntExists(fullPath)
                if (file.children && file.children.length) {
                  doCopyStaticFiles({
                    ...parameters,
                    level: parameters.level + 1,
                    files: [...file.children],
                    accumulated: modelPartialPath
                  })
                }
              } else {
                try {
                  var contents = twigRender({ data: fs || ''}, parameters)
                  log(`Copying model file: ${fullPath}`, { type: 'advance', level: parameters.level, verbosity: 7 })
                  aptugo.writeFile( fullPath, contents, true )
                } catch(e) {
                  console.error('Error compiling template for file: ', fileName, e)
                }
              }
            } 
          }
        } else if (file.type === 'folder') {
          aptugo.createIfDoesntExists(fullPath)
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
            aptugo.writeFile( fullPath, contents, true )
          } catch(e) {
            error('Error compiling template for file: ', fileName, e)
          }
        }
      }
    })
  }
  doCopyStaticFiles({ ...parameters, level: 0, files: parameters.files || parameters.template.files })
}
