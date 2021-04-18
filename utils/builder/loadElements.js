const fs = require('fs')
const path = require('path')
const { fsLoadAndParseFile } = require('../templates')

module.exports = (elements) => {
  doloadElements = (elements, preset = '') => {
    const output = []
    elements.forEach(element => {
      if (!aptugo.plain) aptugo.plain = {}
      aptugo.plain[element.unique_id] = element
      if (element.type === 'folder') {
        output.push( ...doloadElements(element.children, `${preset}${element.path}`))
      } else {
        const [settings,fs] = fsLoadAndParseFile(element.unique_id)

        output.push({
          ...element,
          ...settings,
          source: fs,
          path: `${preset}${element.path}`,
          realPath: `${preset}${element.path}`,
        })
        if (!output.find(item => item.path === element.path)) {
          output.push({
            ...element,
            ...settings,
            source: fs,
            realPath: `${preset}${element.path}`,
            path: `${element.path}`
          })
        }
      }
    })

    return output
  }
  const le = doloadElements(elements)
  return le
}
