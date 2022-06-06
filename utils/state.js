const fs = require('fs')
const path = require('path')
const { list: listApps } = require('./apps')
const { list: listTemplates } = require('./templates')

const emptyState = {
  apps: [],
  templates: [],
  auth: {
    user: {
      name: 'anonymous'
    }
  },
  app: {}
}

let savedState = {}

module.exports = {
  setState: (setting) => {
    savedState = setting
  },
  state: async () => {
    const toReturn = { ...emptyState, ...savedState }

    toReturn.apps = await listApps()
    toReturn.templates = await listTemplates()
    return toReturn
  }
} 
