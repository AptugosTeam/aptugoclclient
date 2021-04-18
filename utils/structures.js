const fs = require('fs')
const path = require('path')
const error = require('./error')
const { get } = require('./config')
const { state: loadState } = require('../utils/state')
const { fix: fixPages } = require('./pages')

module.exports = {
  list: () => {
    const toReturn = []
    const folders = get('folders')
    const structFolders = fs.readdirSync(folders.structures)
    structFolders.forEach(structFolder => {
      try {
        const structDefinition = JSON.parse( fs.readFileSync(path.join(folders.structures,structFolder,'structure.json'), { encoding: 'utf8'}, true) )
        toReturn.push(structDefinition)
      } catch(e) {}
    })
    return toReturn
  },

  run: async (structure, parameters) => {
    let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

    const state = await loadState()
    const folders = get('folders')
    const structFolders = fs.readdirSync(folders.structures)
    let currentStructureFolder
    structFolders.forEach(structFolder => {
      try {
        const structDefinition = JSON.parse( fs.readFileSync(path.join(folders.structures,structFolder,'structure.json'), { encoding: 'utf8'}, true) )
        if (structDefinition._id === structure._id) currentStructureFolder = structFolder
      } catch(e) {}
    })

    const init = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'init.js'), { encoding: 'utf8'}, true)
    const initFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', init)
    returned = await initFunction( state.app, state, parameters, {} )
    if (returned) {
      if (returned.error) {
        error(returned.error, true)
      }
      if (returned.pages) returned.pages = fixPages(returned.pages)
      state.app = returned 
    }

    const code = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'code.js'), { encoding: 'utf8'}, true)
    const codeFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', code)
    returned = await codeFunction( state.app, state, parameters, {} )
    if (returned) { 
      if (returned.pages) returned.pages = fixPages(returned.pages)
      state.app = returned 
    }

    const postinit = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'postinit.js'), { encoding: 'utf8'}, true)
    const piFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', postinit)
    returned = await piFunction( state.app, state, parameters, {} )
    if (returned) { 
      if (returned.pages) returned.pages = fixPages(returned.pages)
      state.app = returned 
    }
    return returned
  }
} 
