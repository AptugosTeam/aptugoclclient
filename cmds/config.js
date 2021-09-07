const { get, set, clear } = require('../utils/config')
const prompt = require('prompt')
const homedir = require('os').homedir()

const configOptions = {
  'license': {
    name: 'license',
    validator: /^[0-9A-Z\-]+$/,
    warning: 'License must be only upppercase letters, numbers, or dashes'
  },
  'folders': [
    {
      name: 'applications',
      description: 'Applications folder',
      default: `${homedir}/Aptugo/applications`
    },
    {
      name: 'templates',
      description: 'Templates folder',
      default: `${homedir}/Aptugo/templates`
    },
    {
      name: 'structures',
      description: 'Structures folder',
      default: `${homedir}/Aptugo/structures`
    },
    {
      name: 'build',
      description: 'Build folder',
      default: `${homedir}/Aptugo/Builds`
    }
  ]
}

function onErr(err) {
  console.error(err)
  return 1
}

module.exports = async (args) => {
  try {
    if (args.list || args.l || args._[1] === 'list') {
      const allOptions = get()
      console.log(`All configured options:\n`, JSON.parse(JSON.stringify(allOptions)) )
    }
    if (args.list || args.c || args._[1] === 'clear') {
      clear()
      console.log(`All configured options cleared\n`)
    }
    if (args.list || args.c || args._[1] === 'set') {
      set(args.var, args.value)
    }
    if (args.ask || args.a || args._[0] === 'ask') {
      prompt.start()
      console.log(args)
      prompt.get( configOptions[args._[1]], function (err, result) {
        if (err) return onErr(err)

        if ( Array.isArray( configOptions[args._[1]] ) ) {
          set(args._[1], result)
        } else {
          const varName = configOptions[args._[1]].name
          set(varName, result[varName])
        }
      })
    }
  } catch (err) {
    console.error(err)
  }
}


