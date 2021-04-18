const fs = require('fs')
const path = require('path')
const { list: listApps } = require('./apps')
const { list: listTemplates } = require('./templates')

module.exports = {
  state: async () => {
    const toReturn = {
      apps: [],
      templates: [],
      auth: {
        user: {
          name: 'anonymous'
        }
      },
      app: {}
    }

    toReturn.apps = await listApps()
    toReturn.templates = await listTemplates()
    return toReturn
  }
} 
