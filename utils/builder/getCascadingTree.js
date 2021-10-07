const fs = require('fs')
const path = require('path')
const { fsLoadAndParseFile } = require('../templates')

module.exports = (unique_id, accumulated = []) => {
  getCascadingTree = (unique_id, accumulated = []) => {
    if (aptugocli.plain[unique_id]) {
      if (aptugocli.plain[unique_id].parent && aptugocli.plain[unique_id].parent !== 'not set') {
        accumulated.push(aptugocli.plain[unique_id].parent)
        accumulated = getCascadingTree(aptugocli.plain[unique_id].parent, accumulated)
      }
    }
    return accumulated
  }
  
  const gct = getCascadingTree(unique_id, accumulated = [])
  return gct
}
