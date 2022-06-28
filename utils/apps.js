import fs from 'fs'
import path from 'path'

import { write } from './files.js'
import config from './config.js'

export default {
  list: () => {
    const toReturn = []
    const folders = config.get('folders')
    const appFolders = fs.readdirSync(folders.applications)
    appFolders.forEach(appFolder => {
      try {
        const appDefinition = JSON.parse( fs.readFileSync(path.join(folders.applications,appFolder,'basics.json'), { encoding: 'utf8'}, true) )
        if (appDefinition.settings) toReturn.push(appDefinition)
      } catch(e) {}
    })
    return toReturn
  },
  load: (app) => {
    const appFolderDefinition = config.get('folders').applications
    const appFolders = fs.readdirSync(appFolderDefinition)
    appFolders.forEach(appFolder => {
      try {
        const appDefinition = JSON.parse( fs.readFileSync(path.join(appFolderDefinition, appFolder, 'basics.json'), { encoding: 'utf8'}, true) )
        if (appDefinition._id === app._id || appDefinition._id === app) {
          if (typeof app === 'string') {
            app = { ...appDefinition }
          }
          app.folder = appFolder
          app.tables = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'tables.json' ), { encoding: 'utf8'}, true) )
          app.pages = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'pages.json' ), { encoding: 'utf8'}, true) )
          app.assets = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'assets.json' ), { encoding: 'utf8'}, true) )

          makeItPlain = (element) => {
            return element.map(ele => {
              const eleDefinition = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'Pages', `${ele.unique_id}.json` ), { encoding: 'utf8'}, true) )
              if (ele.children) ele.children = makeItPlain(ele.children)
              aptugocli.plain[ele.unique_id] = { ...ele, ...eleDefinition }
              return { ...ele, ...eleDefinition }
            })
          }

          app.pages = makeItPlain(app.pages)
          app.tables = app.tables.map(table => {
            const tableDefinition = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'Tables', `${table.unique_id}.json` ), { encoding: 'utf8'}, true) )
            aptugocli.plainTables[table.unique_id] = tableDefinition
            tableDefinition.fields.forEach(field => {
              if (!aptugocli.plainFields) aptugocli.plainFields = {}
              aptugocli.plainFields[field.unique_id] = field
            })
            return tableDefinition
          })

        }
      } catch(e) {}
    })
    return app
  },
  save: (app) => {
    const folders = config.get('folders')
    const appFolders = folders.applications
    const saveFolder = path.join(appFolders, aptugocli.friendly(app.settings.name))

    aptugocli.createIfDoesntExists(saveFolder)
    aptugocli.createIfDoesntExists(path.join(saveFolder,'Tables'))
    aptugocli.createIfDoesntExists(path.join(saveFolder,'Pages'))

    let { _id, createdAt, modifiedAt, lastBuild, ...rest } = app
    modifiedAt = new Date().getTime()
    write({ saveFolder: saveFolder, filename: 'basics.json', content: { _id, createdAt, modifiedAt, lastBuild, settings: { ...app.settings } } })
    if (app.tables) write({ saveFolder: saveFolder, filename: 'tables.json', content: app.tables, clean: 'Tables' })
    if (app.pages) write({ saveFolder: saveFolder, filename: 'pages.json', content: app.pages, clean: 'Pages' })
    if (app.assets) write({ saveFolder: saveFolder, filename: 'assets.json', content: app.assets })
    return app
  },
  remove: (app) => {
    const folders = config.get('folders')
    const appFolders = folders.applications
    const saveFolder = path.join(appFolders, aptugocli.friendly(app.settings.name))
    fs.rmdirSync(saveFolder, { recursive: true })
  }
}
