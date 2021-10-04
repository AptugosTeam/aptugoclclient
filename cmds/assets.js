const readline = require('readline')
const {
  fileSource: source,
  setfile: file,
} = require('../utils/assets')

const filesource = async (args) => {
  return source(args.app, args.asset)
}

const setfile = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', function (def) {
    const newdef = file(args, def)
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'load':
      console.log( await filesource(args) )
      break
    case 'setfile':
      await setfile(args)
      break
  }
}
