const Conf = require('conf')

module.exports = {
  get: (varName = undefined) => {
    const config = new Conf()
    if (!varName) return config.store
    return config.get(varName)
  },
  set: (varName, value) => {
    const config = new Conf()
    config.set(varName, value)
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
