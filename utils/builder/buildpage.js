import fs from 'fs'
import path from 'path'
import pages from '../pages.js'
import error from '../error.js'
const chalk = import("chalk")
import twigRender from './twigRender.js'
import log from '../log.js'
import buildElement from './buildElement.js'
import getCascadingTree from './getCascadingTree.js'

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

export default (page, parameters) => {
  const buildPage = (page, parameters) => {
    if (parameters.stoped) return
    // Load page
    const pageDefiniton = { ...pages.load(page.unique_id, parameters.appFolder), ...page }
    aptugocli.currentRenderingPage = pageDefiniton
    log(`Building page: ${aptugocli.currentRenderingPage.name}`, { type: 'title', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 6 })

    // Build Elements
    page.children.forEach(pageChild => {
      const childDefiniton = pages.load(pageChild.unique_id,parameters.appFolder)
      if (childDefiniton.type === 'page') {
        try {
          buildPage({ ...pageChild, ...childDefiniton }, { ...parameters, level: (parameters.level || 0) + 1 })
        } catch(e) {
          const theError = e.exitCode ? e : { exitCode: 121, message: 'Well, how the turntables', element: page, type: 'page', error: e }
          throw(theError)
        }
      } else {
        try {
          buildElement({ ...pageChild, ...childDefiniton }, { ...parameters, page: pageDefiniton, level: (parameters.level || 0) + 1  })
        } catch(e) {
          const theError = e.exitCode ? e : { exitCode: 122, message: 'Well, how the turntables', element: pageChild, type: 'element', error: e }
          throw(theError)
        }

      }
    })

    log(`Rendering page: ${pageDefiniton.name}`, { type: 'title', level: parameters.level, unique_id: pageDefiniton.unique_id, verbosity: 7 })
    // Render Content
    let pageContent = []
    page.children.forEach(pageChild => {
      const childDefiniton = pages.load(pageChild.unique_id, parameters.appFolder)
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
