const fs = require('fs')
const path = require('path')
const error = require('./error.js')
const config = require('./config.js')
const { state: loadState, setState: updateState } = require('../utils/state.js')
const log = require('../utils/log.js')
const pages = require('./pages.js')
const tables = require('./tables.js')
const fixPages = pages.fix
const fixTables = tables.fix


const structures = {
  loadedState: null,
  list: () => {
    const toReturn = []
    const folders = config.get('folders')
    const structFolders = fs.readdirSync(folders.structures)
    structFolders.forEach(structFolder => {
      try {
        const structDefinition = JSON.parse( fs.readFileSync(path.join(folders.structures,structFolder,'structure.json'), { encoding: 'utf8'}, true) )
        toReturn.push({ ...structDefinition, structFolder: structFolder, fullFolder: path.join(folders.structures,structFolder) })
      } catch(e) {}
    })
    return toReturn
  },

  findStructure: (structureNameOrID) => {
    const struct = structures.list().find(s => {
      if (s.name === structureNameOrID) return s
      else if (s._id === String(structureNameOrID)) return s
    })
    if (struct) return struct
    else {
      error(`Could not find a structure named (or with id): ${structureNameOrID}`, true)
    }
  },

  run: async (structure, parameters) => {
    aptugocli.structures = structures
    if (!structures.loadedState) structures.loadedState = parameters.state || await loadState()
    const state = parameters.state || structures.loadedState

    if (typeof structure === 'string' || typeof structure === 'number') {
      structure = structures.findStructure(structure)
    }
    log(`Running Structure: ${structure.name}`, { type: 'mainTitleSub' })

    let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

    const folders = config.get('folders')
    const structFolders = fs.readdirSync(folders.structures)
    let currentStructureFolder
    structFolders.forEach(structFolder => {
      try {
        const structDefinition = JSON.parse( fs.readFileSync(path.join(folders.structures,structFolder,'structure.json'), { encoding: 'utf8'}, true) )
        if (structDefinition._id === structure._id) currentStructureFolder = structFolder
      } catch(e) {}
    })

    const init = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'init.js'), { encoding: 'utf8'}, true)
    const initFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', 'aptugo', init)

    let returned = await initFunction( state.app, state, parameters, config.get(), aptugocli )
    if (returned) {
      if (returned.error) { error(returned.error, true) }
      if (returned.pages) returned.pages = fixPages(returned.pages)
      if (returned.tables) returned.tables = fixTables(returned.tables)
      state.app = returned
      updateState({ ...state, app: returned })
    }

    const code = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'code.js'), { encoding: 'utf8'}, true)
    const codeFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', 'aptugo', code)
    returned = await codeFunction( state.app, state, parameters, config.get(), aptugocli )
    if (returned) {
      if (returned.pages) returned.pages = fixPages(returned.pages)
      if (returned.tables) returned.tables = fixTables(returned.tables)
      state.app = returned
      updateState({ ...state, app: returned })
    }

    const postinit = fs.readFileSync(path.join(folders.structures,currentStructureFolder,'postinit.js'), { encoding: 'utf8'}, true)
    if (postinit) {
      const piFunction = new AsyncFunction('Application', 'State', 'Parameters', 'Store', 'aptugo', postinit)
      returned = await piFunction( state.app, state, parameters, config.get(), aptugocli )
    } else {
      log(`Skiping post init for ${structure.name}`, { verbosity: 8 })
    }

    if (returned) {
      if (returned.pages) returned.pages = fixPages(returned.pages)
      if (returned.tables) returned.tables = fixTables(returned.tables)
      state.app = returned
      updateState({ ...state, app: returned })
    }
    return returned
  },

  icon: (structure, parameters) => {
    if (typeof structure !== 'object') {
      structure = structures.findStructure(structure)
    }
    if (structure) {
      return path.join(structure.fullFolder, structure.icon)
    } else {
      error(`Could not find structure: ${structure}`)
    }

  }
}

module.exports = {
  structures: structures
}
