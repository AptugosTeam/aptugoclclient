const fs = require('fs')
const path = require('path')

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
  getTree: (folder) => {
    const output = []

    const filesInFolder = fs.readdirSync(folder)
    filesInFolder.forEach(file => {
      const toPush = {
        unique_id: aptugo.generateID(),
        path: file
      }
      if (fs.lstatSync( path.join(folder, file) ).isDirectory()) {
        toPush.type = 'folder'
        toPush.children = module.exports.getTree( path.join(folder, file) )
      } else {

      }
      output.push(toPush)
    })
    return output
  }
} 
