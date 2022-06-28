import twigPkg from 'twig/twig.js'
const { extendFilter, extendFunction, twig: _twig, cache } = twigPkg
import error from '../error.js'

export default (twigParameters, parameters, element) => {
  let toReturn = ''
  const template = _twig(twigParameters)
  try {
    toReturn = template.render({ ...parameters, builder: aptugocli })
  } catch(e) {
    error(`Problem rendering ${element.value}`, true)
  }
  return toReturn
}
