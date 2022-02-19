const log = require('../log')
const error = require('../error')
const getCascadingTree = require('./getCascadingTree')
const { load: loadPage } = require('../pages')
const twigRender = require('./twigRender')

function getInheritedChilds(element) {
  const parentsTree = getCascadingTree(element.unique_id)
  const elementsTreeTilPage = [element]
  let index = 0
  let parentElement = aptugocli.plain[parentsTree[index]]
  if (parentElement) {
    while( parentElement && parentElement.type !== 'page') {
      if (parentElement.type === 'element') elementsTreeTilPage.push(parentElement)
      index++
      parentElement = aptugocli.plain[parentsTree[index]]
    }
  }

  elementsTreeTilPage.reverse()
  let toReturn = []
  
  for (var I = index + 1; I < parentsTree.length; I++) {
    const theParent = aptugocli.plain[parentsTree[I]]
    for (var O = 0; O < elementsTreeTilPage.length; O++) {
      const currentElement = elementsTreeTilPage[O]
      const preFound = theParent.children.find(child => child.value === currentElement.value)
      if (O === elementsTreeTilPage.length - 1) {
        const found = preFound && preFound.children ? preFound.children.filter(ff => ff.cascades) : []
        found.forEach(indfound => toReturn.push(aptugocli.plain[indfound.unique_id]))
      }
    }
  }
  return toReturn
}

module.exports = (element, parameters) => {
  buildField = (parameters) => {
    if (parameters.stoped) return
    let elementPath
    if (parameters.element.values.Field) {
      const fieldToRender = aptugocli.plainFields[parameters.element.values.Field]
      if (!fieldToRender) {
        error(`There's an error in ${parameters.page.name} - ${element.name}.`, true)
      }
      parameters.field = fieldToRender
      elementPath = `Fields${fieldToRender.data_type}${parameters.element.values.Type}.tpl`
    } else if (parameters.element.values.fieldVariable) {
      elementPath = `FieldsVarShow.tpl`
    }
    return elementPath
  },
  deserializeFunction = (funcString, parameters) => {
    return new Function('builder', `return ${funcString}`)
  },
  parseToString = (input, parameters) => {
    let output = ''
    try {
      const params = {
        plainTables: Object.values(aptugocli.plainTables)
      }
      // this.helper.log(this.plainTables)
      output = deserializeFunction(input, parameters).call({})(params)
    } catch(e) {
      error(`Could not parse to String ${input}`, true)
    }
    return output
  },
  parseElementValues = (values, parameters) => {
    let newValues = {}
    Object.keys(values).map(valueName => {
      if (values[valueName] && values[valueName].substr && values[valueName].substr(0,2) === '()') {
        let replacedValue = values[valueName].replace('aptugo.store.getState().application.tables','Object.values(aptugocli.plainTables)')
        replacedValue = '(params)' + replacedValue.substr(2)
        newValues[valueName] = parseToString(replacedValue, parameters)
      } else if (values[valueName] && values[valueName].substr && values[valueName].indexOf('{{') > -1) {
        let replaceValue = values[valueName].replace(/\{\{(.*)\}\}/g,(match, contents) => {
          return eval(`parameters.${contents}`)
        })
        newValues[valueName] = replaceValue
      } else {
        newValues[valueName] = values[valueName]
      }
    })
    return newValues
  },
  buildElement = (element, parameters) => {
    if (parameters.stoped) return
    if (parameters.render) return renderElement(element, parameters)
    else {
      log(`Building element: ${element.name} (${element.value} - ${parameters.page.name} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8, id: element.unique_id })
      let elementPath
      let toReturn = ''
      let subElementsContent = ''
      aptugocli.skipDelaySaving = false

      if (element.value === 'field') {
        if (element.values.fieldVariable) {
          buildElement({ ...element, value: `FieldsVarshow` }, parameters)
        } else if (element.values.Field) {
          const fieldToRender = aptugocli.plainFields[element.values.Field]
          parameters.field = fieldToRender
          buildElement({ ...element, value: `Fields${fieldToRender.data_type}${element.values.Type}` }, parameters)
        }
      }
  
      // Render childs first and saves into content
      element.children && element.children.forEach((child) => {
        const childDefiniton = loadPage(child.unique_id, parameters.appFolder)
        subElementsContent += buildElement({ ...childDefiniton, ...child }, { ...parameters, level: parameters.level + 1 })
      })
      parameters.content = subElementsContent
      
      const inherits = getInheritedChilds(element)
      inherits.forEach(inherit => {
        if ( shouldaddinherit(element, inherit) ) buildElement(inherit, { ...parameters, level: parameters.level + 1 } )
      })
  
      // Loads full element definition
      const elementDefiniton = loadPage(element.unique_id, parameters.appFolder)
      parameters.element = { ...element }
      if (parameters.element.values) parameters.element.values = parseElementValues(parameters.element.values, parameters)
      aptugocli.currentRenderingElement = parameters.element
      
      // handle FIELDS special case
      const broughtElement = aptugocli.loadedElements.find(item => item.path === `${parameters.element.value}.tpl`)
      elementPath = broughtElement.realPath || `${element.value}.tpl`
      
      // Brings delayed content matching this element
      parameters.delayed = []
      if (parameters.page.delays) {
        if (broughtElement.usesDelays) { // Non-linear use of delays
          const res = broughtElement.usesDelays.filter(item => parameters.page.delays[item])
          res.forEach(section => {
            parameters.delayed.push({ [section]: parameters.page.delays[section] })
          })
        }
        if (parameters.page.delays[parameters.element.value]) {
          parameters.delayed = parameters.delayed.concat(parameters.page.delays[parameters.element.value])
        }
        parameters.delayed = parameters.delayed.concat(inherits.map(inherit => inherit.delays))
      } 

      // Check for Element Extra Files
      if (broughtElement.extraFiles) {
        const extraFilesLoaded = broughtElement.extraFiles.map(ef => {
          return { ...ef, ...parameters }
        })
        aptugocli.filesRequiredByElements.push(...extraFilesLoaded)
      }

      // Check for Element Extra Settings
      if (broughtElement.settings) {
        broughtElement.settings.forEach(setting => {
          if (!aptugocli.extraSettings[setting.name]) aptugocli.extraSettings[setting.name] = []
          const innRender = twigRender({ data: setting.value, rethrow: true }, parameters, parameters.element)
          if (aptugocli.extraSettings[setting.name].indexOf(innRender) === -1) aptugocli.extraSettings[setting.name].push(innRender)
        })
      }
    
      try {
        toReturn += twigRender({ ref: elementPath, debug: false, trace: false, rethrow: true }, parameters, parameters.element)
        broughtElement.rendered = toReturn
        aptugocli.plain[parameters.element.unique_id].rendered = toReturn
        log(`√ Element built: ${element.name} (${element.value} - ${parameters.page.name} - ${elementPath})`, { type: 'advance', level: parameters.level, verbosity: 10 })
      } catch(e) {
        console.error(e)
        error(`Problems building ${element.value}`, true)
      }

      return toReturn
    }
    
  },
  // If child with the same edited name is present as an element child, ignore the inherit
  shouldaddinherit = (element, inherit) => {
    let toreturn = true
    element.children && element.children.find(ele => {
      if (ele.name !== ele.value) {
        if (inherit.name === ele.name) {
          toreturn = false
        }
      }
    })
    return toreturn
  },
  renderElement = (element, parameters) => {
    if (parameters.stoped) return
    log(`Rendering element: ${element.name} (${element.value} - ${parameters.page.unique_id} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8, id: element.unique_id })
    let toReturn = ''
    let subElementsContent = ''
    aptugocli.skipDelaySaving = true

    // Render childs first
    element.children && element.children.forEach((child) => {
      const childDefiniton = loadPage(child.unique_id, parameters.appFolder)
      subElementsContent += renderElement({ ...childDefiniton, ...child }, {...parameters, level: parameters.level + 1})
    })
    parameters.content = subElementsContent
    
    const inherits = getInheritedChilds(element)
    let inheritedContent = ''

    

    if (inherits.length) {
      inherits.forEach(inherit => {
        if (inherit.forEach) {
          inherit.forEach(sub => {
            if (shouldaddinherit(element, inherit)) {
              log(`Adding inherit : ${sub.name} (${sub.value} - ${parameters.page.unique_id} - ${sub.unique_id})`, { type: 'advance', level: parameters.level + 1, verbosity: 9, id: sub.unique_id })
              inheritedContent += sub.rendered
            }
          })
        } else {
          if (shouldaddinherit(element, inherit)) {
            log(`Adding inherit : ${inherit.name} (${inherit.value} - ${parameters.page.unique_id} - ${inherit.unique_id})`, { type: 'advance', level: parameters.level + 1, verbosity: 9, id: inherit.unique_id })
            inheritedContent += inherit.rendered
          }
        }
      })
    }

    const elementDefiniton = loadPage(element.unique_id, parameters.appFolder)
    aptugocli.currentRenderingElement = { ...element, ...elementDefiniton }
    if (aptugocli.currentRenderingElement.values) aptugocli.currentRenderingElement.values = parseElementValues(aptugocli.currentRenderingElement.values, parameters)

    parameters.delayed = parameters.page.delays ? parameters.page.delays[aptugocli.currentRenderingElement.value] || [] : []
    parameters.element = aptugocli.currentRenderingElement
    const broughtElement = aptugocli.loadedElements.find(item => item.path === `${aptugocli.currentRenderingElement.value}.tpl`)
    let elementPath = broughtElement.realPath || `${element.value}.tpl`
    
    // console.log( aptugocli.currentRenderingElement.value  )
    if (aptugocli.currentRenderingElement.value === 'field') {
      if (aptugocli.currentRenderingElement.values.fieldVariable) {
        elementPath = `FieldsVarshow.tpl`
      } else if (aptugocli.currentRenderingElement.values.Field) {
        const fieldToRender = aptugocli.plainFields[aptugocli.currentRenderingElement.values.Field]
        if (!fieldToRender) {
          console.log(`There's an error in ${parameters.page.name} - ${aptugocli.currentRenderingElement.name}.`, true)
        }
        parameters.field = fieldToRender
        elementPath = `Fields${fieldToRender.data_type}${element.values.Type}.tpl`
      }
    }
    
    try {
      if (inheritedContent !== '') {
        parameters.content = inheritedContent + parameters.content
      }
      toReturn += twigRender({ ref: elementPath, debug: false, trace: false, rethrow: true }, parameters, aptugocli.currentRenderingElement)
      broughtElement.rendered = toReturn
    } catch(e) {
      error(`Problems rendering ${element.value}`, true)
    }

    return toReturn
  }
  
  const be = buildElement(element, parameters)
  return be
}
