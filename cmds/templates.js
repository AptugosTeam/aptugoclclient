const fs = require('fs')
const readline = require('readline')
const {
  list: templatesList,
  setoption: option,
  setfield: field,
  fileSource: source,
  setfile: file,
  remove,
  create,
  version
} = require('../utils/templates')
const Table = require('cli-table')
const { stdin } = require('process')

const list = async (args) => {
  const templates = await templatesList(true)
  if (args.raw) return JSON.stringify(templates)

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

const setfile = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', function (def) {
    const newdef = file(args.template, def)
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

const filesource = async (args) => {
  return source(args.template, args.file)
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'list':
      console.log( await list(args) )
      break
    case 'version':
      console.log( await version(args) )
      break
    case 'create':
      console.log( await createTemplate(args) )
      break
    case 'delete':
      console.log( await remove(args) )
      break
    case 'setoption':
      await setoption(args)
      break
    case 'setfield':
      await setfield(args)
      break
    case 'setfile':
      await setfile(args)
      break
    case 'fileSource':
      console.log( await filesource(args) )
      break
  }
}
