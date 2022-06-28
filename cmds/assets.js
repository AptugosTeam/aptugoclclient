import readline from 'readline'
import { load: appload } from '../utils/apps'
const {
  fileSource: source,
  fileRead: read,
  setfile: file,
  upload
} = import('../utils/assets')

const filepath = async (args) => {
  const app = await appload(args.app)
  return source(app.folder, args.asset)
}

const filesource = async (args) => {
  return source(args.app, args.asset)
}

const fileRead = async (args) => {
  return read(args.app, args.asset)
}

const setfile = async (args, extraarguments = null) => {
  const fromcommandline = !!import.main
  let newdef

  if (extraarguments && extraarguments.file) {
    newdef = await file(args, extraarguments.file)
  } else {
    var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
    r1.question('Paste definition here\n', function (def) {
      newdef = file(args, def)
      r1.close()
      process.stdin.destroy()
    })
  }
  console.log('newdef', newdef)
  return newdef
}

let output
export async (args, extraarguments) => {
  switch (args._[1]) {
    case 'path':
      output = await filepath(args)
      break
    case 'load':
      output = await filesource(args)
      break
    case 'read':
        output = await fileRead(args)
        break
    case 'setfile':
      output = setfile(args, extraarguments)
      break
    case 'upload':
      output = upload(args)
      break
  }
  return output
}
