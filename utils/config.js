const Conf = require('conf')

module.exports = {
  get: (varName = undefined) => {
    const config = new Conf()
    if (!varName) return config.store
    return config.get(varName)
  },
  set: (varName, value) => {
    const config = new Conf()
    console.log('set', varName, value)
    config.set(varName, value)
    if (varName.substr(0,7) === 'folders') {
      if (typeof value === 'string') {
        aptugo.createIfDoesntExists(value)
      } else {
        Object.keys(value).map(objKey => {
          aptugo.createIfDoesntExists(value[objKey])
        })
      }
    }
    return config.get(varName)
  },
  clear: () => {
    const config = new Conf()
    config.clear()
  },
  check: () => {
    const config = new Conf()
    const requiredConfigFolders = ['applications', 'templates', 'structures', 'build']
    const configuredFolders = config.get('folders')
    if (!configuredFolders) {
      return 1
    } else {
      return 0
    }
  }
} 
