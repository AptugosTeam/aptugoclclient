const fs = require('fs')
const path = require('path')
const { fsLoadAndParseFile } = require('../templates')
const twig = require('twig/twig.js')
const log = require('../log')

module.exports = (parameters) => {
  doCopyStaticFiles = (parameters) => {
    parameters.files.forEach(prefile => {
      let skip = false
      if (prefile.path === 'elements') skip = true

      if (!skip) {
        let [postfile,fs] = fsLoadAndParseFile(prefile.unique_id)
        const file = { ...prefile, ...postfile }
        let fileName = file.path
        let partialPath = path.join(parameters.buildFolder, fileName )
        let fullPath = file.fullPath || path.join(parameters.fullbuildfolder, partialPath)
        aptugo.currentFile = {
          ...file,
          fullPath: fullPath
        }

        if (file.modelRelated) {
          for (var table in parameters.application.tables) {
            if (file.subtype === 'Any' || (file.subtype === parameters.application.tables[table].subtype)) {
              let calculatedFilename = twig.twig({ data: partialPath })
              let modelfileName = calculatedFilename.render({ table: parameters.application.tables[table] })
              let modelPartialPath = path.join(parameters.buildFolder, modelfileName)
              fullPath = path.join(parameters.fullbuildfolder, modelfileName)
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
                    files: [...file.children],
                    buildFolder: modelPartialPath
                  })
                }
              } else {
                try {
                  var template = twig.twig({ data: fs || ''})
                  var contents = template.render(parameters)
                  aptugo.writeFile( fullPath, contents, true )
                } catch(e) {
                  console.error('Error compiling template for file: ', fileName, e)
                }
              }
            } 
          }
        } else if (file.type === 'folder') {
          aptugo.createIfDoesntExists(fullPath)
          if (file.children && file.children.length) {
            doCopyStaticFiles({
              ...parameters,
              files: [...file.children],
              buildFolder: partialPath
            })
          }
        } else {
          try {
            var template = twig.twig({ data: fs || ''})
            var contents = template.render(parameters)
            log(`Copying static file: ${fullPath}`, { type: 'advance', level: parameters.level, verbosity: 7 })
            aptugo.writeFile( fullPath, contents, true )
          } catch(e) {
            console.error('Error compiling template for file: ', fileName, e)
          }
        }
      }
    })
  }

  doCopyStaticFiles({ ...parameters, files: parameters.files || parameters.template.files })
}
