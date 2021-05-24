const { list: templatesList } = require('../utils/templates')
const Table = require('cli-table')

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

module.exports = async (args) => {
  switch (args._[1]) {
    case 'list':
      console.log( await list(args) )
      break
  }
}
