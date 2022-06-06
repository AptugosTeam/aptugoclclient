const Conf = require('conf')
const os = require('os')
const { execSync, spawnSync } = require('child_process')

module.exports = {
  get: (varName = undefined) => {
    const config = new Conf({ projectName: 'Aptugo' })
    if (!varName) return config.store || {}
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
        const regex = /v([0-9.]*)/gm;
        const ss = spawnSync(`node -v`, { shell: true })
        const str = ss.stdout.toString()
        const m = regex.exec(str)
        return m[1]
      } catch(e) {
        console.log(e)
        return 'error'
      }
    }

    verifyMongo = function() {
      // FIX PATH
      let returnValue = {}
      try {
        const result = execSync(`${ os.userInfo().shell} -ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`, { shell: true }).toString()
        for (const line of result.split('\n').filter(line => Boolean(line))) {
          const [key, ...values] = line.split('=');
          returnValue[key] = values.join('=');
        }
      } catch(e) {
        console.log('error', e)
      }
      if (returnValue.PATH) process.env.PATH = returnValue.PATH
      const regex = /version v([0-9.]*)/gm;
      try {
        const ss = spawnSync(`mongod --version`, { shell: true, env: process.env } )
        const str = ss.stdout.toString()
        const m = regex.exec(str)
        return m[1]
      } catch(e) {
        return 'error'
      }
    }

    verifyPNPM = function() {
      try {
        const regex = /([0-9.]*)/gm;
        const ss = spawnSync(`pnpm -v`, { shell: true })
        const str = ss.stdout.toString()
        const m = regex.exec(str)
        return m[1]
      } catch(e) {
        return 'error'
      }
    }

    return new Promise((resolve, reject) => {
      resolve({
        node: verifyNode(),
        mongo: verifyMongo(),
        pnpm: verifyPNPM()
      })
    })
  }
} 
