const fs = require('fs')
const path = require('path')
const { fsLoadAndParseFile } = require('../templates')

module.exports = (unique_id, accumulated = []) => {
  getCascadingTree = (unique_id, accumulated = []) => {
    if (aptugo.plain[unique_id]) {
      if (aptugo.plain[unique_id].parent && aptugo.plain[unique_id].parent !== 'not set') {
        accumulated.push(aptugo.plain[unique_id].parent)
        accumulated = getCascadingTree(aptugo.plain[unique_id].parent, accumulated)
      }
    }
    return accumulated
  }
  
  const gct = getCascadingTree(unique_id, accumulated = [])
  return gct
}
