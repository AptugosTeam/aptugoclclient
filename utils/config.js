const Conf = require('conf')

module.exports = {
  get: (varName = undefined) => {
    const config = new Conf({ projectName: 'Aptugo' })
    if (!varName) return config.store
    return config.get(varName)
  },
  set: (varName, value) => {
    const config = new Conf({ projectName: 'Aptugo' })
    console.log('set', varName, value)
    config.set(varName, value)
    if (varName.substr(0,7) === 'folders') {
      if (typeof value === 'string') {
        aptugocli.createIfDoesntExists(value)
      } else {
        Object.keys(value).map(objKey => {
          aptugocli.createIfDoesntExists(value[objKey])
        })
      }
    }
    return config.get(varName)
  },
  clear: () => {
    const config = new Conf({ projectName: 'Aptugo' })
    config.clear()
  },
  check: () => {
    const config = new Conf({ projectName: 'Aptugo' })
    const requiredConfigFolders = ['applications', 'templates', 'structures', 'build']
    const configuredFolders = config.get('folders')
    if (!configuredFolders) {
      return 1
    } else {
      return 0
    }
  }
} 
