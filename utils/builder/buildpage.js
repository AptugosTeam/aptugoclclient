const fs = require('fs')
const path = require('path')
const { load: loadPage } = require('../pages')
const error = require('../error')
const chalk = require("chalk")
const twigRender = require('./twigRender')
const log = require('../log')


function getCascadingTree(unique_id, accumulated = []) {
  if (aptugo.plain[unique_id]) {
    if (aptugo.plain[unique_id].parent && aptugo.plain[unique_id].parent !== 'not set') {
      accumulated.push(aptugo.plain[unique_id].parent)
      accumulated = getCascadingTree(aptugo.plain[unique_id].parent, accumulated)
    }
  }
  return accumulated
}

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

module.exports = (page, parameters) => {
  buildPage = (page, parameters) => {
    // Load page
    const pageDefiniton = { ...page, ...loadPage(page.unique_id, parameters.appFolder) }
    aptugo.currentRenderingPage = pageDefiniton
    log(`Building page: ${aptugo.currentRenderingPage.name}`, { type: 'title', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 6 })

    // Build Elements
    page.children.forEach(pageChild => {
      const childDefiniton = loadPage(pageChild.unique_id, parameters.appFolder)
      if (childDefiniton.type === 'page') {
        buildPage({ ...pageChild, ...childDefiniton }, { ...parameters, level: (parameters.level || 0) + 1 })
      } else {
        buildElement({ ...pageChild, ...childDefiniton }, { ...parameters, page: pageDefiniton, level: (parameters.level || 0) + 1  })
      }
    })

    log(`Rendering page: ${pageDefiniton.name}`, { type: 'title', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 7 })
    // Render Content
    let pageContent = []
    page.children.forEach(pageChild => {  
      const childDefiniton = loadPage(pageChild.unique_id, parameters.appFolder)
      if (childDefiniton.type === 'element') {
        const rendered = renderElement({ ...childDefiniton, ...pageChild }, {...parameters, page: pageDefiniton, level: (parameters.level || 0) + 1  } )
        pageContent.push(rendered)
      }
    })
    parameters.content = pageContent.join('')
    
    // Finalize page build
    const renderedPage = twigRender({ data: '{{ content }}', rethrow: true }, parameters, pageDefiniton)
    log(`Rendered page: ${pageDefiniton.name}`, { type: 'tit', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 9 })
    if (pageDefiniton.filename) {
      const pagePath = path.join(parameters.fullbuildfolder, aptugo.generationFolder, pageDefiniton.filename)
      aptugo.writeFile(pagePath, renderedPage, true)
    }
  }

  // Builds the source code for an element
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
    let elementPath = broughtElement.realPath || `${element.value}.tpl`
    if (parameters.element.value === 'field' && parameters.element.values.Field) {
      const fieldToRender = aptugo.plainFields[element.values.Field]
      parameters.field = fieldToRender
      elementPath = `Fields${fieldToRender.data_type}${element.values.Type}.tpl`
    }

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

  // Renders the element into the parent
  renderElement = (element, parameters) => {
    log(`Rendering element: ${element.name} (${element.value} - ${parameters.page.unique_id} - ${element.unique_id})`, { type: 'advance', level: parameters.level, verbosity: 8 })
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
    parameters.delayed = parameters.page.delays ? parameters.page.delays[aptugo.currentRenderingElement.value] || [] : []
    // parameters.delayed = parameters.delayed.concat(inherits.map(inherit => inherit.delays))
    parameters.element = aptugo.currentRenderingElement
    const broughtElement = aptugo.loadedElements.find(item => item.path === `${aptugo.currentRenderingElement.value}.tpl`)
    let elementPath = broughtElement.realPath || `${element.value}.tpl`
    
    if (aptugo.currentRenderingElement.value === 'field' && aptugo.currentRenderingElement.values.Field) {
      const fieldToRender = aptugo.plainFields[element.values.Field]
      parameters.field = fieldToRender
      elementPath = `Fields${fieldToRender.data_type}${element.values.Type}.tpl`
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

  buildPage(page, parameters)
}
