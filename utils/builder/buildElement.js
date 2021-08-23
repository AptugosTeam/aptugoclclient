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
    while( parentElement.type !== 'page') {
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
      const fieldToRender = aptugo.plainFields[element.values.Field]
      if (!fieldToRender) {
        error(`There's an error in ${parameters.page.name} - ${element.name}.`, true)
      }
      parameters.field = fieldToRender
      elementPath = `Fields${fieldToRender.data_type}${element.values.Type}.tpl`
    } else if (parameters.element.values.fieldVariable) {
      elementPath = `FieldsVarShow.tpl`
    }
    return elementPath
  },
  buildElement = (element, parameters) => {
    log(`Building element: ${element.name} (${element.value} - ${parameters.page.name} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8 })

    let toReturn = ''
    let subElementsContent = ''
    aptugo.skipDelaySaving = false

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
    parameters.element = { ...element, ...elementDefiniton }
    aptugo.currentRenderingElement = parameters.element
    
    // Brings delayed content matching this element
    parameters.delayed = parameters.page.delays ? parameters.page.delays[parameters.element.value] || [] : []
    parameters.delayed = parameters.delayed.concat(inherits.map(inherit => inherit.delays))
    
    // handle FIELDS special case
    const broughtElement = aptugo.loadedElements.find(item => item.path === `${parameters.element.value}.tpl`)
    let elementPath = parameters.element.value === 'field' ? module.exports.buildField(parameters) : broughtElement.realPath || `${element.value}.tpl`

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
      log(`√ Element built: ${element.name} (${element.value} - ${parameters.page.name})`, { type: 'advance', level: parameters.level, verbosity: 10 })
    } catch(e) {
      console.error(e)
      error(`Problems rendering ${element.value}`, true)
    }
    return toReturn
  }
  
  const be = buildElement(element, parameters)
  return be
}
