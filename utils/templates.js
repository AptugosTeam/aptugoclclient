const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { get } = require('./config')
const { getTree } = require('./files')
const { exit } = require('process')
const { isBinary } = require('istextorbinary')

module.exports = {
  list: (loadfull = false) => {
    const toReturn = []
    const folders = get('folders')
    const templateFolders = fs.readdirSync(folders.templates)
    templateFolders.forEach(templateFolder => {
      try {
        if (fs.lstatSync( path.join(folders.templates,templateFolder) ).isDirectory()) {
          if (fs.existsSync(path.join(folders.templates,templateFolder,'template.json'))) {
            const fileContents = fs.readFileSync(path.join(folders.templates,templateFolder,'template.json'), { encoding: 'utf8'}, true)
            if (fileContents) {
              let templateDefinition = JSON.parse( fileContents )
              if ( loadfull ) {
                templateDefinition = module.exports.get(templateDefinition._id, templateFolder)
              }
              toReturn.push(templateDefinition)
            }
          }
        }
      } catch(e) {
        console.error(e)
      }
    })
    return toReturn
  },
  version: (args) => {
    const folders = get('folders')
    if ( folders.templates && fs.existsSync( path.join(folders.templates, 'version.txt') ) ) {
      const version = fs.readFileSync( path.join(folders.templates, 'version.txt'), { encoding: 'utf8' } )
      return version
    } else {
      return 'unknown'
    }
  },
  create: (args) => {
    args = JSON.parse(args)
    const folders = get('folders')
    const templateDefinitionFolder = path.join(folders.templates, args._id)
    if (!fs.existsSync(templateDefinitionFolder)) {
      fs.mkdirSync(templateDefinitionFolder)
    }
    fs.writeFileSync(path.join(templateDefinitionFolder,'template.json'), JSON.stringify( args, null, 2 ), { flag:'w' })
    return args
  },
  remove: (args) => {
    const template = args.template
    const folders = get('folders')
    const tplFolders = folders.templates
    const saveFolder = path.join(tplFolders, template)
    fs.rmdirSync(saveFolder, { recursive: true })
    return 'ok'
  },
  setoption: (templateFolder, option, value) => {
    const folders = get('folders')
    const templateFilePath = path.join(folders.templates,templateFolder,'template.json')
    const templateContents = fs.readFileSync(templateFilePath)
    if (templateContents) {
      let templateDefinition = JSON.parse( templateContents )
      templateDefinition[option] = value
      fs.writeFileSync(templateFilePath, JSON.stringify(templateDefinition, null, 2), {flag:'w'})
    }
  },
  setfield: (templateFolder, fieldDefinition) => {
    const folders = get('folders')
    const templateFolderPath = path.join(folders.templates,templateFolder)
    const fieldsDefinitionFolder = path.join(templateFolderPath,'Fields')
    if (!fs.existsSync(fieldsDefinitionFolder)) {
      fs.mkdirSync(fieldsDefinitionFolder)
    }
    fs.writeFileSync(path.join(fieldsDefinitionFolder,`${fieldDefinition.name}.json`), JSON.stringify( JSON.parse(fieldDefinition.value), null, 2 ), { flag:'w' })
    return path.join(fieldsDefinitionFolder,`${fieldDefinition.name}.json`)
  },
  setfile: (templateFolder, fileDefinition) => {
    const fileDetails = JSON.parse(fileDefinition)
    const parsedFile = module.exports.fsParseFileForStorage(fileDetails)
    const folders = get('folders')
    const templateFolderPath = path.join(folders.templates,templateFolder)

    const fileName = fileDetails.modelRelated ? fileDetails.completePath.replace(/{{(.*?)}}/g, `${fileDetails.subtype}[X]`) : fileDetails.completePath || fileDetails.path
    if (fileDetails.type === 'folder') {
      const folderPath = path.join(templateFolderPath, fileName)
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath)
      }
      const { children, source, ...cleanFileDetails } = fileDetails
      fs.writeFileSync(path.join(folderPath,'_.yaml'), yaml.dump(cleanFileDetails))
    } else if (parsedFile) {
      fileDetails.source = parsedFile
      const filePath = path.join(templateFolderPath, fileName)
      fs.writeFileSync(filePath, fileDetails.source)
    }
  },
  renderPath: (file) => {
    if (file.modelRelated) {
      return file.path.replace(/{{(.*?)}}/g, `${file.subtype}[X]`)
    } else {
      return file.path
    }
  },
  fileSource: (templateID, fileID) => {
    const folders = get('folders')
    const templates = module.exports.list()
    const currentTemplate = templates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, currentTemplate._id ), '', true )
    const file = module.exports.findFileWithUniqueID(currentTemplate.files, fileID)
    if (!file) return 'Error: File not found'
    const fileSource = fs.readFileSync(path.join(folders.templates, currentTemplate._id, file.completePath,module.exports.renderPath(file)), 'utf8')
    return fileSource
  },
  get: (templateID, templateFolder) => {
    const folders = get('folders')
    const templates = module.exports.list()
    const currentTemplate = templates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, templateFolder || currentTemplate._id ), '', true )
    currentTemplate.fields = module.exports.getFields(templateFolder || currentTemplate._id)
    return currentTemplate
  },
  getFields: (templateFolder) => {
    const output = []
    const folders = get('folders')
    const fieldsFolder = path.join( folders.templates, templateFolder, 'Fields' )
    if (fs.existsSync(fieldsFolder)) {
      const fieldsInFolder = fs.readdirSync( fieldsFolder )
      fieldsInFolder.forEach(fieldFileName => {
        if (fieldFileName.toLowerCase().substr(-4) === 'json') {
          const [discard, fieldSource] = module.exports.fsParseFile( fs.readFileSync(path.join( fieldsFolder, fieldFileName ), 'utf8') )
          
          let parsed
          try {
            parsed = JSON.parse(fieldSource)
            output.push(parsed)
          } catch(e) {
            console.log('error loading ', fieldFileName, e, fieldSource)
          }
        }
      })
    }
    return output
  },
  fsParseFileForStorage(fileDetails) {
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
  },
  fsParseFile: (fileSource) => {
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
  },
  fsLoadAndParseFile: (params) => {
    const fileSource = module.exports.fsLoadFileSource(params)
    return module.exports.fsParseFile(fileSource)
  },
  fsLoadFileSource: (params) => {
    let template, file
    if (!params.file) {
      template = aptugocli.activeParameters.template
      file = params.unique_id
      ? module.exports.findFileWithUniqueID(template.files, params.unique_id , path.join( get('folders').templates ,template._id))
      : module.exports.findFileWithPath(template.files, params.path, path.join( get('folders').templates ,template._id))
    } else {
      file = params.file
    }
    if (!file) return ''

    const fileName = file.modelRelated ? file.path.replace(/{{(.*?)}}/g, `${file.subtype}[X]`) : file.path
    try {
      const fileSource = fs.readFileSync(path.join(file.completePath,fileName), 'utf8')
      file.source = fileSource
      return fileSource
    } catch(e) {
      return ''
    }
  },
  findFileWithUniqueID: (tree, unique_id, acumulated_path = '') => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        const filePath = tree[i].modelRelated ? tree[i].path.replace(/{{(.*?)}}/g, `${tree[i].subtype}[X]`) : tree[i].path
        if (tree[i].unique_id === unique_id) {
          return {
            ...tree[i],
            completePath: acumulated_path
          }
        }
        var found = module.exports.findFileWithUniqueID(tree[i].children, unique_id, path.join(acumulated_path, filePath))
        if (found) return found
      }
    }
  },
  findFileWithPath: (tree, thepath, acumulated_path) => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        const filePath = tree[i].modelRelated ? tree[i].path.replace(/{{(.*?)}}/g, `${tree[i].subtype}[X]`) : tree[i].path
        if (tree[i].completePath === thepath) {
          return {
            ...tree[i],
            completePath: acumulated_path
          }
        }
        var found = module.exports.findFileWithPath(tree[i].children, thepath, path.join(acumulated_path, filePath))
        if (found) return found
      }
    }
  },
  searchForRenderingPlaceholder: (tree, acumulated = '.') => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i].placeholder === true) {
          return acumulated + tree[i].path
        }
        var found = module.exports.searchForRenderingPlaceholder(tree[i].children, acumulated + '/' + tree[i].path + '/')
        if (found) return found
      }
    }
  }
}
