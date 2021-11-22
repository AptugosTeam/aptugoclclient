const Conf = require('conf')
const { execSync } = require('child_process')

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
  },
  verifySystem: () => {
    verifyNode = function() {
      try {
        return execSync(`node -v`).toString().trim()
      } catch(e) {
        return 'error'
      }
    }

    verifyMongo = function() {
      const regex = /version v([0-9.]*)/gm;
      try {
        const str = execSync(`mongod --version`).toString()
        const m = regex.exec(str)
        return m[1]
      } catch(e) {
        return 'error'
      }
    }

    verifyPNPM = function() {
      try {
        return execSync(`pnpm -v`).toString().trim()
      } catch(e) {
        return 'error'
      }
    }

    return new Promise((resolve, reject) => {
      // FIX PATH
      let returnValue = {}
      try {
        const result = execSync(`${ os.userInfo().shell} -ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`).toString()
        for (const line of result.split('\n').filter(line => Boolean(line))) {
          const [key, ...values] = line.split('=');
          returnValue[key] = values.join('=');
        }
      } catch(e) {
      }
      if (returnValue.PATH) process.env.PATH = returnValue.PATH
      resolve({
        node: verifyNode(),
        mongo: verifyMongo(),
        pnpm: verifyPNPM()
      })
    })
  }
} 
