const apps = require('./apps.js')
const templates = require('./templates.js')

const emptyState = {
  apps: [],
  templates: [],
  auth: {
    user: {
      name: 'anonymous'
    }
  },
  app: {},
  extraSettings: {},
  filesWithExtraSettings: []
}

let savedState = {}

exports.getPath = () => {
  return process.env.PATH
}

exports.setState = (setting) => {
  savedState = { ...savedState, ...setting }
}

exports.state = async () => {
  const toReturn = { ...emptyState, ...savedState }
  if (toReturn.apps) toReturn.apps = await apps.list()
  if (toReturn.templates) toReturn.templates = await templates.list()
  return toReturn
}

exports.stateSync = () => {
  const toReturn = { ...emptyState, ...savedState }
  return toReturn
}
