const fs = require('fs')
const readline = require('readline')
const {
  list: templatesList,
  setoption: option,
  setfield: field,
  fileSource: source,
  setfile: file,
  get,
  remove,
  create,
  version
} = require('../utils/templates')
const Table = require('cli-table')
const { stdin } = require('process')

const list = async (args) => {
  const templates = await templatesList(true)
  if (args.raw) return templates

  let simpleList = []
  var table = new Table({
    head: ['Name', 'Description']
  })
  
  templates.forEach(tpl => {
    table.push([tpl.name, tpl.desc || 'no description'])
    simpleList.push(tpl.name)
  })
  if (args.extended) return table.toString()
  else return simpleList
}

const setoption = async (args) => {
  await option(args.template, args.optionName, args.optionValue)
  return list({ raw: true })
}

const createTemplate = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    const newdef = await create(def)
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

const setfield = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', function (def) {
    const newdef = field(args.template, { ...args, name: args.name, value: def })
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

const setfile = async (args, extraarguments = null) => {
  const fromcommandline = !!require.main
  let newdef
  if (fromcommandline) {
    var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
    r1.question('Paste definition here\n', function (def) {
      newdef = file(args.template, def)
      r1.close()
      process.stdin.destroy()
    })
  } else {
    newdef = file(args, extraarguments.file)
  }
  return newdef
}

const filesource = async (args) => {
  return source(args.template, args.file)
}

let output 
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'list':
      output = await list(args)
      break
    case 'version':
      output = await version(args)
      break
    case 'create':
      output = await createTemplate(args)
      break
    case 'delete':
      output = await remove(args)
      break
    case 'setoption':
      output = setoption(args)
      break
    case 'setfield':
      output = setfield(args)
      break
    case 'setfile':
      output = setfile(args, extraarguments)
      break
    case 'get':
      output = get(args.template)
      break
    case 'fileSource':
      output = await filesource(args)
      break
  }
  return output
}
