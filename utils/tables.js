import fs from 'fs'
import path from 'path'

export default {
  fix: (tables) => {
    tables = tables.map(table => module.exports.fixTable(table))
    return tables
  },
  fixTable: (table, force = false) => {
    const newTable = force ? {} : table
    if (!newTable.fields) newTable.fields = []
    if (newTable.fields.length) newTable.fields = newTable.fields.map(field => module.exports.fixField(field))

    return newTable
  },
  fixField: (field, force = false, table = 'not set') => {
    const newField = force ? {} : field
    if (!newField.unique_id) newField.unique_id = aptugocli.generateID()
    if (newField.CHARACTER_MAXIMUM_LENGTH) {
      newField.length = newField.CHARACTER_MAXIMUM_LENGTH
      delete(newField.CHARACTER_MAXIMUM_LENGTH)
    }
    if (newField.data_type === 'Integer') newField.data_type = 'Number'
    return newField
  },
  load: (unique_id, appFolder) => {
    const tablePath = path.join(appFolder, 'Tables', `${unique_id}.json`)
    const tableDefinition = JSON.parse( fs.readFileSync( tablePath, { encoding: 'utf8'}, true) )
    return tableDefinition
  }
}
