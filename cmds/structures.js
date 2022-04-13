const { 
  list: structList,
  icon: structIcon
} = require('../utils/structures')


const Table = require('cli-table');

const list = async (args) => {
  const structs = await structList()
  if (args.raw) return structs

  let simpleList = []
  var table = new Table({
    head: ['Type', 'Name', 'Description']
  })
  
  structs.forEach(struct => {
    table.push([struct.type, struct.name, struct.desc || 'no description'])
    simpleList.push(struct.name)
  })
  if (args.extended) return table.toString()
  else return simpleList
}

const icon = async(args) => {
  const res = await structIcon(args.structure)
  return res
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'list':
      return await list(args)
      break
    case 'icon':
      return await icon(args)
      break
  }
}
