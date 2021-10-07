const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')
const error = require('../error')

module.exports = (twigParameters, parameters, element) => {
  let toReturn = ''
  const template = _twig(twigParameters)
  try {
    toReturn = template.render({ ...parameters, builder: aptugocli })
  } catch(e) {
    console.error(e, element)
    error(`Problem rendering ${element.value}`, true)
  }
  return toReturn
}