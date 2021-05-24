const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { get } = require('./config')
const { getTree } = require('./files')

module.exports = {
  list: (loadfull = false) => {
    const toReturn = []
    const folders = get('folders')
    const templateFolders = fs.readdirSync(folders.templates)
    templateFolders.forEach(templateFolder => {
      try {
        let templateDefinition = JSON.parse( fs.readFileSync(path.join(folders.templates,templateFolder,'template.json'), { encoding: 'utf8'}, true) )
        if ( loadfull ) {
          templateDefinition = module.exports.get(templateDefinition._id)
        }
        toReturn.push(templateDefinition)
      } catch(e) {
        console.error(e)
      }
    })
    return toReturn
  },
  get: (templateID) => {
    const folders = get('folders')
    const templates = module.exports.list()
    const currentTemplate = templates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, currentTemplate._id ) )
    return currentTemplate
  },
  fsLoadAndParseFile: (unique_id) => {
    const fileSource = module.exports.fsLoadFileSource(unique_id)
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
  fsLoadFileSource: (unique_id) => {
    const template = aptugo.activeParameters.template
    const file = module.exports.findFileWithPath(template.files, unique_id, path.join( get('folders').templates ,template._id)) 
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
  findFileWithPath: (tree, unique_id, acumulated_path) => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        const filePath = tree[i].modelRelated ? tree[i].path.replace(/{{(.*?)}}/g, `${tree[i].subtype}[X]`) : tree[i].path
        if (tree[i].unique_id === unique_id) {
          return {
            ...tree[i],
            completePath: acumulated_path
          }
        }
        var found = module.exports.findFileWithPath(tree[i].children, unique_id, path.join(acumulated_path, filePath))
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
