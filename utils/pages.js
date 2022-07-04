const fs = require('fs')
const path = require('path')

const pagesModule = {
  fix: (pages, parent = null) => {
    if (Array.isArray(pages)) {
      pages = pages.map(page => pagesModule.fix(page, parent))
    } else if (pages.type === 'page') {
      pages = pagesModule.fixPage(pages, false, parent)
    } else if (pages.type === 'element') {
      pages = pagesModule.fixElement(pages, false, parent)
    } else {
      console.log('Fix Pages', pages)
    }

    if (pages.children) pages.children = pagesModule.fix(pages.children, pages)
    return pages
  },
  fixPage: (page, force = false, parent = false) => {
    const newPage = force ? {} : page
    newPage.parent = parent ? parent.unique_id : false
    if (!newPage.unique_id) newPage.unique_id = aptugocli.generateID()
    if (!newPage.path) newPage.path = page.path || ''
    if (!newPage.children) newPage.children = []
    delete newPage.rendered
    delete newPage.delays
    return newPage
  },
  fixElement: (element, force = fasle, page = 'not set') => {
    const newElement = force ? {} : element
    newElement.parent = page.unique_id
    newElement.type = 'element'
    if (!newElement.unique_id) newElement.unique_id = aptugocli.generateID()
    if (!newElement.name) newElement.name = element.value || element.path.substr(0, element.path.indexOf('.'))
    if (!newElement.value) newElement.value = element.value || element.path.substr(0, element.path.indexOf('.'))
    if (!newElement.prevent_delete) newElement.prevent_delete = element.prevent_delete || false
    if (!newElement.cascades) newElement.cascades = false
    if (!newElement.children) newElement.children = []

    delete newElement.rendered
    delete newElement.delays
    return newElement
  },
  load: (unique_id, appFolder) => {
    const pagePath = path.join(appFolder, 'Pages', `${unique_id}.json`)
    const pageDefinition = JSON.parse( fs.readFileSync( pagePath, { encoding: 'utf8'}, true) )
    return pageDefinition
  },
  updateElement: (element, args) => {
    console.log(element, args)
  }
}

module.exports = pagesModule
