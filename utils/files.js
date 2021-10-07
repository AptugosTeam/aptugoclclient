const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { isBinary } = require('istextorbinary')

const fsParseFileForStorage = (fileDetails) => {
  const {
    source,
    open,
    selected,
    selectedFile,
    ...cleanFileDetails
  } = fileDetails

  let output = '/*\n'
  output += yaml.dump(cleanFileDetails)
  output += '*/\n'
  output += fileDetails.source
  return output
}

const getTree = (folder, accumulatedPath = '', fix = false) => {
  const ignoreFiles = ['template.json','.DS_Store','_.yaml','templatescripts']
  const output = []
  const filesInFolder = fs.readdirSync(folder)
  filesInFolder.forEach(file => {
    if (ignoreFiles.indexOf(file) === -1) {
      let toPush = {
        path: file,
        completePath: path.join(accumulatedPath, file)
      }
      if (fs.lstatSync( path.join(folder, file) ).isDirectory()) {
        toPush.type = 'folder'
        toPush.unique_id = aptugocli.generateID()
        toPush.children = getTree( path.join(folder, file), path.join(accumulatedPath, file), fix )
        try {
          const folderSource = fs.readFileSync( path.join(folder, file, '_.yaml'), 'utf8')
          toPush = { ...toPush, ...yaml.load(folderSource) }
        } catch(e) {}
      } else {
        const binary = isBinary(path.join(folder, file))
        if (!binary) {
          const fileSource = fs.readFileSync( path.join(folder, file), 'utf8')
          const [prefs, source] = module.exports.parseFile(fileSource)
          toPush = { ...toPush, ...prefs }
          if (fix) {
            if (!prefs.unique_id) { // Add and save unique_id if not exists
              toPush.unique_id = aptugocli.generateID()
              fs.writeFileSync(path.join(folder, file), fsParseFileForStorage({ ...toPush, source }), { flag: 'w' } )
            }
          } else {
            toPush.unique_id = prefs.unique_id || aptugocli.generateID()
          }
        }
      }
      output.push(toPush)
    }
  })
  return output
}

module.exports = {
  write: ({ saveFolder, filename, content, clean = false }) => {
    const cleanForSaving = (input, folder) => {
      let output = []
      input.forEach(actualObject => {
        const { unique_id, ...rest } = actualObject
        const { children, ...actualObjectWithoutChildren } = actualObject
        fs.writeFileSync( path.join( saveFolder, folder, `${unique_id}.json`), JSON.stringify(actualObjectWithoutChildren, null, 2), { flag: 'w' } )

        const localOutput = { unique_id }
        if (actualObject.children && actualObject.children.length > 0) localOutput.children = cleanForSaving(actualObject.children, folder)
        output.push(localOutput)
      })
      return output  
    }

    if (clean) content = cleanForSaving(content, clean)

    fs.writeFileSync(
      path.join(saveFolder, filename),
      JSON.stringify(content, null, 2),
      { flag: 'w' }
    )
  },
  getTree: getTree,
  parseFile: (fileSource) => {
    const regex = /^\/\*[\r]*\n(.*)[\r]*\n\*\/(.*)/is
    let m
    if ((m = regex.exec(fileSource)) !== null) {
      var yamlStuff = ''
      try {
        yamlStuff = yaml.load(m[1])
      } catch(e) {
        console.error(fileSource, e)
      }
      return [ yamlStuff , m[2]]
    }
    return [{}, fileSource]
  }
} 
