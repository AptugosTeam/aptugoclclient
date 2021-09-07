const log = require('../log')
const error = require('../error')
const getCascadingTree = require('./getCascadingTree')
const { load: loadPage } = require('../pages')
const twigRender = require('./twigRender')

function getInheritedChilds(element) {
  const parentsTree = getCascadingTree(element.unique_id)
  const elementsTreeTilPage = [element]
  let index = 0
  let parentElement = aptugo.plain[parentsTree[index]]
  if (parentElement) {
    while( parentElement && parentElement.type !== 'page') {
      if (parentElement.type === 'element') elementsTreeTilPage.push(parentElement)
      index++
      parentElement = aptugo.plain[parentsTree[index]]
    }
  }

  elementsTreeTilPage.reverse()
  let toReturn = []
  
  for (var I = index + 1; I < parentsTree.length; I++) {
    const theParent = aptugo.plain[parentsTree[I]]
    for (var O = 0; O < elementsTreeTilPage.length; O++) {
      const currentElement = elementsTreeTilPage[O]
      const preFound = theParent.children.find(child => child.value === currentElement.value)
      if (O === elementsTreeTilPage.length - 1) {
        const found = preFound && preFound.children ? preFound.children.filter(ff => ff.cascades) : []
        found.forEach(indfound => toReturn.push(aptugo.plain[indfound.unique_id]))
      }
    }
  }
  return toReturn
}

module.exports = (element, parameters) => {
  buildField = (parameters) => {
    let elementPath
    if (parameters.element.values.Field) {
      const fieldToRender = aptugo.plainFields[parameters.element.values.Field]
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
        plainTables: Object.values(aptugo.plainTables)
      }
      // this.helper.log(this.plainTables)
      output = deserializeFunction(input, parameters).call({})(params)
    } catch(e) {
      console.log(e)
      error(`Could not parse to String ${input}`, true)
    }
    return output
  },
  parseElementValues = (values, parameters) => {
    let newValues = {}
    Object.keys(values).map(valueName => {
      if (values[valueName] && values[valueName].substr && values[valueName].substr(0,2) === '()') {
        let replacedValue = values[valueName].replace('aptugo.store.getState().application.tables','Object.values(aptugo.plainTables)')
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
    if (parameters.render) return renderElement(element, parameters)
    else {
      log(`Building element: ${element.name} (${element.value} - ${parameters.page.name} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8, id: element.unique_id })
      let elementPath
      let toReturn = ''
      let subElementsContent = ''
      aptugo.skipDelaySaving = false

      if (element.value === 'field') {
        if (element.values.fieldVariable) {
          console.log('Var to Show', element)
          buildElement({ ...element, value: `FieldsVarshow` }, parameters)
        } else if (element.values.Field) {
          const fieldToRender = aptugo.plainFields[element.values.Field]
          console.log('Field To Render ', fieldToRender)
          parameters.field = fieldToRender
          buildElement({ ...element, value: `Fields${fieldToRender.data_type}${element.values.Type}` }, parameters)
          // elementPath = `Fields${fieldToRender.data_type}${parameters.element.values.Type}.tpl`
          // if (!parameters.render) {
          //   console.log('field2', fieldToRender)
          //   // buildElement({ ...parameters.element, field: fieldToRender, value: `Fields${fieldToRender.data_type}${parameters.element.values.Type}` }, { ...parameters, level: parameters.level + 1 })
          // } else {
          //   console.log('field3',fieldToRender)
          //   parameters.field = fieldToRender
          //   elementPath = `Fields${fieldToRender.data_type}${parameters.element.values.Type}.tpl`
          // }
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
        buildElement(inherit, { ...parameters, level: parameters.level + 1 } )
      })
  
      // Loads full element definition
      const elementDefiniton = loadPage(element.unique_id, parameters.appFolder)
      parameters.element = { ...element }
      if (parameters.element.values) parameters.element.values = parseElementValues(parameters.element.values, parameters)
      if (parameters.element.unique_id === 'vNKLr8gp') {
        console.log('about to parse', parameters.element.values)
      }
      aptugo.currentRenderingElement = parameters.element
      
      // Brings delayed content matching this element
      parameters.delayed = parameters.page.delays ? parameters.page.delays[parameters.element.value] || [] : []
      parameters.delayed = parameters.delayed.concat(inherits.map(inherit => inherit.delays))
      
      // handle FIELDS special case
      const broughtElement = aptugo.loadedElements.find(item => item.path === `${parameters.element.value}.tpl`)
      elementPath = broughtElement.realPath || `${element.value}.tpl`
      
  
      // Check for Element Extra Settings
      if (broughtElement.settings) {
        broughtElement.settings.forEach(setting => {
          if (!aptugo.extraSettings[setting.name]) aptugo.extraSettings[setting.name] = []
          const innRender = twigRender({ data: setting.value, rethrow: true }, parameters, parameters.element)
          if (aptugo.extraSettings[setting.name].indexOf(innRender) === -1) aptugo.extraSettings[setting.name].push(innRender)
        })
      }
    
      try {
        toReturn += twigRender({ ref: elementPath, debug: false, trace: false, rethrow: true }, parameters, parameters.element)
        broughtElement.rendered = toReturn
        aptugo.plain[parameters.element.unique_id].rendered = toReturn
        log(`√ Element built: ${element.name} (${element.value} - ${parameters.page.name} - ${elementPath})`, { type: 'advance', level: parameters.level, verbosity: 10 })
      } catch(e) {
        console.error(e)
        error(`Problems building ${element.value}`, true)
      }
      return toReturn
    }
    
  },
  renderElement = (element, parameters) => {
    log(`Rendering element: ${element.name} (${element.value} - ${parameters.page.unique_id} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8, id: element.unique_id })
    let toReturn = ''
    let subElementsContent = ''
    aptugo.skipDelaySaving = true

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
          inherit.forEach(sub => inheritedContent += sub.rendered)
        } else inheritedContent += inherit.rendered
      })
    }

    const elementDefiniton = loadPage(element.unique_id, parameters.appFolder)
    aptugo.currentRenderingElement = { ...element, ...elementDefiniton }
    if (aptugo.currentRenderingElement.values) aptugo.currentRenderingElement.values = parseElementValues(aptugo.currentRenderingElement.values, parameters)

    parameters.delayed = parameters.page.delays ? parameters.page.delays[aptugo.currentRenderingElement.value] || [] : []
    // parameters.delayed = parameters.delayed.concat(inherits.map(inherit => inherit.delays))
    parameters.element = aptugo.currentRenderingElement
    const broughtElement = aptugo.loadedElements.find(item => item.path === `${aptugo.currentRenderingElement.value}.tpl`)
    let elementPath = broughtElement.realPath || `${element.value}.tpl`
    
    // console.log( aptugo.currentRenderingElement.value  )
    if (aptugo.currentRenderingElement.value === 'field') {
      if (aptugo.currentRenderingElement.values.fieldVariable) {
        elementPath = `FieldsVarshow.tpl`
      } else if (aptugo.currentRenderingElement.values.Field) {
        const fieldToRender = aptugo.plainFields[aptugo.currentRenderingElement.values.Field]
        if (!fieldToRender) {
          console.log(`There's an error in ${parameters.page.name} - ${aptugo.currentRenderingElement.name}.`, true)
        }
        parameters.field = fieldToRender
        elementPath = `Fields${fieldToRender.data_type}${element.values.Type}.tpl`
      }
    }
    
    try {
      if (inheritedContent !== '') parameters.content = inheritedContent + parameters.content
      toReturn += twigRender({ ref: elementPath, debug: false, trace: false, rethrow: true }, parameters, aptugo.currentRenderingElement)
      broughtElement.rendered = toReturn
    } catch(e) {
      console.error(e)
      error(`Problems rendering ${element.value}`, true)
    }
    return toReturn
  }
  
  const be = buildElement(element, parameters)
  return be
}
