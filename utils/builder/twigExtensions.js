const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')

module.exports = {
  castToArray: (value) => {
    return Object.entries(value)
  },
  elementData: (value) => {
    return aptugo.plain[value]
    //   return builderObj.plainPages[value]
  },
  fieldData: (value) => {
    // if (!value) return
    let fieldDefinition = value
    if (!value) {
      console.log('value', value, aptugo.currentRenderingElement.name, aptugo.currentRenderingPage.name)
    }
    if (value.type === 'element') return value
    
    if (!value.unique_id) {
      fieldDefinition = aptugo.plainFields[value]
      if (!fieldDefinition) console.log('value:', value)
    }
    
    const tempExtDef = aptugo.activeParameters.template.fields.filter(field => field.value === fieldDefinition.data_type)
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

    aptugo.activeParameters.application.tables.forEach(table => {
      const filtered = table.fields.filter(field => field.unique_id === fieldDefinition.unique_id)
      if (filtered && filtered.length) toReturn.table = table
    })
    return toReturn
  },
  includeTemplate: (templateID) => {
    let template = null
    if (typeof templateID === 'string') {
      const elementPath = aptugo.loadedElements.find(item => item.path === templateID).realPath || templateID
      template = _twig({ allowInlineIncludes: true, ref: elementPath, rethrow: true })
    } else {
      for (var I = 0; I < templateID.length; I++) {
        let elementPath = aptugo.loadedElements.find(item => item.path === templateID[I])
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
      var loadedElement = aptugo.loadedElements.find(loadedElement => loadedElement.path === templateID)
      if (loadedElement.settings) {
        loadedElement.settings.forEach(setting => {
          if (!aptugo.extraSettings[setting.name]) aptugo.extraSettings[setting.name] = []
          let inntemplate = _twig({ data: setting.value, rethrow: true })
          const innRender = inntemplate.render(aptugo.currentRenderingElement)
          if (aptugo.extraSettings[setting.name].indexOf(innRender) === -1) aptugo.extraSettings[setting.name].push(innRender)
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
    if (!aptugo.skipDelaySaving) {
      let delays = aptugo.currentRenderingPage.delays || {}
      if (!delays[section]) delays[section] = []
      if (delays[section].indexOf(content.trim()) < 0) {
        if (priority === 1) delays[section].unshift(content.trim())
        else delays[section].push(content.trim())
      }
      aptugo.currentRenderingPage.delays = delays
    }
  },
  tableData: (value) => {
    return aptugo.activeParameters.application.tables.find(table => table.unique_id === value)
  },
  assetData: (value) => {
    return aptugo.plainAssets[value]
  },
  addSetting: (settingName, settingValue) => {
    if (!aptugo.extraSettings[settingName]) aptugo.extraSettings[settingName] = []
    if (aptugo.extraSettings[settingName].indexOf(settingValue) === -1) aptugo.extraSettings[settingName].push(settingValue)
  },
  insertSetting: (setting) => {
    let output = null
    if (aptugo.skipSettings) { // SAVE 
      const exists = aptugo.filesWithExtraSettings.filter(fwes => fwes.unique_id === aptugo.currentFile.unique_id)
      if (exists.length === 0) {
        aptugo.filesWithExtraSettings.push({
          ...aptugo.currentFile,
          savePath: 'aaaa'
        })
      }
    } else { // APPLY
      output = aptugo.extraSettings[setting] ? typeof aptugo.extraSettings[setting] === 'string' ? aptugo.extraSettings[setting] : aptugo.extraSettings[setting].join('\n') : ''
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