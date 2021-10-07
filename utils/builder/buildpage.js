const fs = require('fs')
const path = require('path')
const { load: loadPage } = require('../pages')
const error = require('../error')
const chalk = require("chalk")
const twigRender = require('./twigRender')
const log = require('../log')
const  buildElement = require('./buildElement')
const getCascadingTree = require('./getCascadingTree')

function getInheritedChilds(element) {
  const parentsTree = getCascadingTree(element.unique_id)
  const elementsTreeTilPage = [element]
  let index = 0
  let parentElement = aptugocli.plain[parentsTree[index]]
  if (parentElement) {
    while( parentElement.type !== 'page') {
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

module.exports = (page, parameters) => {
  buildPage = (page, parameters) => {
    // Load page
    const pageDefiniton = { ...loadPage(page.unique_id, parameters.appFolder), ...page }
    aptugocli.currentRenderingPage = pageDefiniton
    log(`Building page: ${aptugocli.currentRenderingPage.name}`, { type: 'title', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 6 })

    // Build Elements
    page.children.forEach(pageChild => {
      const childDefiniton = pageChild
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
        const rendered = buildElement({ ...childDefiniton, ...pageChild }, {...parameters, render: true, page: pageDefiniton, level: (parameters.level || 0) + 1  } )
        pageContent.push(rendered)
      }
    })
    parameters.content = pageContent.join('')
    
    // Finalize page build
    const renderedPage = twigRender({ data: '{{ content }}', rethrow: true }, parameters, pageDefiniton)
    log(`Rendered page: ${pageDefiniton.name}`, { type: 'tit', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 9 })
    if (pageDefiniton.filename) {
      const pagePath = path.join(parameters.fullbuildfolder, aptugocli.generationFolder, pageDefiniton.filename)
      aptugocli.writeFile(pagePath, renderedPage, true)
    }
  }
  buildPage(page, parameters)
}
