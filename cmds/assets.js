const readline = require('readline')
const {
  fileSource: source,
  setfile: file,
} = require('../utils/assets')

const filesource = async (args) => {
  return source(args.app, args.asset)
}

const setfile = async (args, extraarguments = null) => {
  const fromcommandline = !!require.main
  let newdef
  if (fromcommandline) {
    var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
    r1.question('Paste definition here\n', function (def) {
      newdef = file(args, def)
      r1.close()
      process.stdin.destroy()
    })
  } else {
    newdef = file(args, extraarguments.file)
  }
  return newdef
}

let output
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'load':
      output = await filesource(args)
      break
    case 'setfile':
      output = setfile(args, extraarguments)
      break
  }
  return output
}
