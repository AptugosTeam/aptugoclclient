const fs = require('fs')
const path = require('path')
const { get } = require('./config')

module.exports = {
  fix: (pages, parent = null) => {
    if (Array.isArray(pages)) {
      pages = pages.map(page => module.exports.fix(page, parent))
    } else if (pages.type === 'page') {
      pages = module.exports.fixPage(pages, false, parent)
    } else if (pages.type === 'element') {
      pages = module.exports.fixElement(pages, false, parent)
    }

    if (pages.children) pages.children = module.exports.fix(pages.children, pages)
    return pages
  },
  fixPage: (page, force = false, parent = false) => {
    const newPage = force ? {} : page
    newPage.parent = parent ? parent.unique_id : false
    if (!newPage.unique_id) newPage.unique_id = aptugo.generateID()
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
    if (!newElement.unique_id) newElement.unique_id = aptugo.generateID()
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
  }
}