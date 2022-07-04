const fs = require('fs')
const readline = require('readline')
const templates = require('../utils/templates.js')
const Table = require('cli-table')
const { stdin } = require('process')

const list = async (args) => {
  const tpls = await templates.list(true)
  if (args.raw) return tpls

  let simpleList = []
  var table = new Table({
    head: ['Name', 'Description']
  })

  tpls.forEach(tpl => {
    table.push([tpl.name, tpl.desc || 'no description'])
    simpleList.push(tpl.name)
  })
  if (args.extended) return table.toString()
  else return simpleList
}

const setoption = async (args) => {
  await templates.setoption(args.template, args.optionName, args.optionValue)
  return list({ raw: true })
}

const createTemplate = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', async (def) => {
    const newdef = await templates.create(def)
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

const setfield = async (args) => {
  var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
  r1.question('Paste definition here\n', function (def) {
    const newdef = templates.field(args.template, { ...args, name: args.name, value: def })
    r1.close()
    process.stdin.destroy()
    return newdef
  })
}

const setfile = async (args, extraarguments = null) => {
  let newdef
  if (fromcommandline) {
    var r1 = readline.createInterface({ input: process.stdin, output: process.stdout })
    r1.question('Paste definition here\n', function (def) {
      newdef = file(args.template, def)
      r1.close()
      process.stdin.destroy()
    })
  } else {
    newdef = templates.setfile(args, extraarguments.file)
  }
  return newdef
}

const filesource = async (args) => {
  return templates.fileSource(args.template, args.file)
}

let output
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'list':
      output = list(args)
      break
    case 'version':
      output = await templates.version(args)
      break
    case 'create':
      output = await createTemplate(args)
      break
    case 'delete':
      output = await templates.remove(args)
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
      output = templates.get(args.template)
      break
    case 'fileSource':
      output = await filesource(args)
      break
    case 'download':
      output = await templates.download(args)
  }
  return output
}
