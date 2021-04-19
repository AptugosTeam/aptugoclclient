const fs = require('fs')
const path = require('path')
const { write } = require('./files')
const { get } = require('./config')

module.exports = {
  list: () => {
    const toReturn = []
    const folders = get('folders')
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
    const toReturn = app
    const appFolderDefinition = get('folders').applications
    const appFolders = fs.readdirSync(appFolderDefinition)
    appFolders.forEach(appFolder => {
      try {
        const appDefinition = JSON.parse( fs.readFileSync(path.join(appFolderDefinition, appFolder, 'basics.json'), { encoding: 'utf8'}, true) )
        if (appDefinition._id === app._id) {
          app.tables = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'tables.json' ), { encoding: 'utf8'}, true) )
          app.pages = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'pages.json' ), { encoding: 'utf8'}, true) )
          app.assets = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'assets.json' ), { encoding: 'utf8'}, true) )

          makeItPlain = (element) => {
            return element.map(ele => {
              const eleDefinition = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'Pages', `${ele.unique_id}.json` ), { encoding: 'utf8'}, true) )
              if (ele.children) ele.children = makeItPlain(ele.children)
              aptugo.plain[ele.unique_id] = { ...ele, ...eleDefinition }
              return { ...ele, ...eleDefinition }
            })
          }

          app.pages = makeItPlain(app.pages)
          app.tables = app.tables.map(table => {
            const tableDefinition = JSON.parse( fs.readFileSync( path.join( appFolderDefinition, appFolder, 'Tables', `${table.unique_id}.json` ), { encoding: 'utf8'}, true) )

            tableDefinition.fields.forEach(field => {
              if (!aptugo.plainFields) aptugo.plainFields = {}
              aptugo.plainFields[field.unique_id] = field
            })
            return tableDefinition
          })
          
        }
      } catch(e) {}
    })
    return app
  },
  save: (app) => {
    const folders = get('folders')
    const appFolders = folders.applications
    const saveFolder = path.join(appFolders, aptugo.friendly(app.settings.name))

    if (!fs.existsSync(saveFolder)) {
      fs.mkdirSync(saveFolder)
      fs.mkdirSync(path.join(saveFolder,'Tables'))
      fs.mkdirSync(path.join(saveFolder,'Pages'))
    }
    if (!fs.existsSync(path.join(saveFolder,'Tables'))) fs.mkdirSync(path.join(saveFolder,'Tables'))
    if (!fs.existsSync(path.join(saveFolder,'Pages'))) fs.mkdirSync(path.join(saveFolder,'Pages'))

    let { _id, createdAt, modifiedAt, ...rest } = app
    modifiedAt = new Date().getTime()
    write({ saveFolder: saveFolder, filename: 'basics.json', content: { _id, createdAt, modifiedAt, settings: { ...app.settings } } })
    if (app.tables) write({ saveFolder: saveFolder, filename: 'tables.json', content: app.tables, clean: 'Tables' })
    if (app.pages) write({ saveFolder: saveFolder, filename: 'pages.json', content: app.pages, clean: 'Pages' })
    if (app.assets) write({ saveFolder: saveFolder, filename: 'assets.json', content: app.assets })
    return app
  },
  remove: (app) => {
    const folders = get('folders')
    const appFolders = folders.applications
    const saveFolder = path.join(appFolders, aptugo.friendly(app.settings.name))
    fs.rmdirSync(saveFolder, { recursive: true })
  }
} 