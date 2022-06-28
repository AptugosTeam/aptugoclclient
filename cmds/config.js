import config from '../utils/config.js'
const { get, set, clear, verifySystem } = config
import prompt from 'prompt'
import os from 'os'
const homedir = os.homedir()

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

export default async (args) => {
  switch (args._[1]) {
    case 'check':
      return await verifySystem()
      break
    case 'list':
      const allOptions = get()
      return allOptions
      break
    case 'clear':
      clear()
      console.log(`All configured options cleared\n`)
      break
    case 'set':
      return { exitCode: 0, message: set(args.var, args.value) }
      break
    case 'ask':
      prompt.start()
      prompt.get( configOptions[args._[2]], function (err, result) {
        if (err) return onErr(err)

        if ( Array.isArray( configOptions[args._[2]] ) ) {
          set(args._[2], result)
        } else {
          const varName = configOptions[args._[2]].name
          set(varName, result[varName])
        }
      })
      break
    default:
      console.log(args)
      console.log('Unrecognized options for config')
  }
}


