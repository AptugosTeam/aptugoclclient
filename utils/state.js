import apps from './apps.js'
import templates from './templates.js'

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

export const getPath = () => {
  return process.env.PATH
}

export const setState = (setting) => {
  savedState = { ...savedState, ...setting }
}

export const state = async () => {
  const toReturn = { ...emptyState, ...savedState }
  if (toReturn.apps) toReturn.apps = await apps.list()
  if (toReturn.templates) toReturn.templates = await templates.list()
  return toReturn
}
