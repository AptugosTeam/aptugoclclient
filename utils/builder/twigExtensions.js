const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')

module.exports = {
  castToArray: (value) => {
    return Object.entries(value)
  },
  elementData: (value) => {
    return aptugocli.plain[value]
    //   return builderObj.plainPages[value]
  },
  fieldData: (value) => {
    if (!value) return
    let fieldDefinition = value
    if (value.type === 'element') return value
    
    if (!value.unique_id) {
      fieldDefinition = aptugocli.plainFields[value]
      if (!fieldDefinition) console.log('value:', value)
    }
    
    const tempExtDef = aptugocli.activeParameters.template.fields.filter(field => field.value === fieldDefinition.data_type)
    if (!tempExtDef.length) {
      throw new Error(`Couldnt load field definition for ${fieldDefinition.data_type}`)
    }
    const extendedDefinition = tempExtDef[0]
    if (extendedDefinition.options) {
      try {
        eval(`extendedDefinition.options = ${extendedDefinition.options}`)
      } catch(e) {}
    }
    const toReturn = { ...extendedDefinition, ...fieldDefinition }

    aptugocli.activeParameters.application.tables.forEach(table => {
      const filtered = table.fields.filter(field => field.unique_id === fieldDefinition.unique_id)
      if (filtered && filtered.length) toReturn.table = table
    })
    return toReturn
  },
  includeTemplate: (templateID) => {
    let template = null
    if (typeof templateID === 'string') {
      const elementPath = aptugocli.loadedElements.find(item => item.path === templateID).realPath || templateID
      template = _twig({ allowInlineIncludes: true, ref: elementPath, rethrow: true })
    } else {
      for (var I = 0; I < templateID.length; I++) {
        let elementPath = aptugocli.loadedElements.find(item => item.path === templateID[I])
        elementPath = elementPath ? elementPath.realPath || templateID[I] : null
        template = _twig({ allowInlineIncludes: true, ref: elementPath, rethrow: true })
        if (!!template) {
          templateID = templateID[I]
          break
        }
      }
    }
      
    if (!template) template = _twig({ ref: 'empty' })
    else {
      var loadedElement = aptugocli.loadedElements.find(loadedElement => loadedElement.path === templateID)
      if (loadedElement.settings) {
        loadedElement.settings.forEach(setting => {
          if (!aptugocli.extraSettings[setting.name]) aptugocli.extraSettings[setting.name] = []
          let inntemplate = _twig({ data: setting.value, rethrow: true })
          const innRender = inntemplate.render(aptugocli.currentRenderingElement)
          if (aptugocli.extraSettings[setting.name].indexOf(innRender) === -1) aptugocli.extraSettings[setting.name].push(innRender)
        })
      }
    }
    return template
  },
  removeExtension: (value) => value.substr(0, value.indexOf('.')),
  parse: (value, params) => {
    const temp = _twig({ data: value })
    return temp.render(params)
  },
  plain: (value, args) => {
    const searchFor = args[0]
    const searchValue = args[1]

    function navigateTree(tree) {
      let toReturn = []
      tree.map(item => {
        if (item[searchFor] === searchValue) toReturn.push(item)
        if (item.children) toReturn = toReturn.concat(navigateTree(item.children))
      })
      return toReturn
    }
    var unsortedTree = navigateTree(value)
    var sortedTree = unsortedTree.sort((a,b) => (a.priority || 5)  > (b.priority || 5) ? 1 : -1)
    return sortedTree
  },
  saveDelayed: (section, content, priority = 5) => {
    if (!aptugocli.skipDelaySaving) {
      let delays = aptugocli.currentRenderingPage.delays || {}
      if (!delays[section]) delays[section] = []
      if (delays[section].indexOf(content.trim()) < 0) {
        if (priority === 1) delays[section].unshift(content.trim())
        else delays[section].push(content.trim())
      }
      aptugocli.currentRenderingPage.delays = delays
    }
  },
  tableData: (value) => {
    return aptugocli.activeParameters.application.tables.find(table => table.unique_id === value)
  },
  assetData: (value) => {
    return aptugocli.plainAssets[value]
  },
  addSetting: (settingName, settingValue) => {
    if (!aptugocli.extraSettings[settingName]) aptugocli.extraSettings[settingName] = []
    if (aptugocli.extraSettings[settingName].indexOf(settingValue) === -1) aptugocli.extraSettings[settingName].push(settingValue)
  },
  insertSetting: (setting) => {
    let output = null
    if (aptugocli.skipSettings) { // SAVE 
      const exists = aptugocli.filesWithExtraSettings.filter(fwes => fwes.unique_id === aptugocli.currentFile.unique_id)
      if (exists.length === 0) {
        aptugocli.filesWithExtraSettings.push({
          ...aptugocli.currentFile,
          savePath: 'aaaa'
        })
      }
    } else { // APPLY
      output = aptugocli.extraSettings[setting] ? (typeof aptugocli.extraSettings[setting] === 'string' || typeof aptugocli.extraSettings[setting] === 'number')  ? aptugocli.extraSettings[setting] : aptugocli.extraSettings[setting].join('\n') : ''
    }
    return output
  },
  withoutVars: (value) => {
    if (value) {
      const regex = /\/\:[\w\?]*(\/|$)/gm;
      const result = value.replace(regex, '$1')
      return result
    } else {
      return value
    }
  }
}