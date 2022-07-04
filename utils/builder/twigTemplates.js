const templates = require('../templates.js')
const fsLoadAndParseFile = templates.fsLoadAndParseFile
const twigPkg = require('twig/twig.js')
const { extendFilter, extendFunction, twig: _twig, cache } = twigPkg
const error = require('../error.js')

module.exports = (templates) => {
  const saveTwigTemplates = (templates, preset = '') => {
    templates.forEach(template => {
      if (template.type === 'folder') {
        saveTwigTemplates(template.children, `${preset}${template.path}`)
      } else {
        const [,fileSource] = fsLoadAndParseFile({ unique_id: template.unique_id })
        if (!fileSource) {
          error(`Error with template ${template.unique_id} ${template.path}`, true)
        }

        try {
          _twig({
            id: `${preset}${template.path}`,
            allowInlineIncludes: true,
            rethrow: true,
            data: fileSource,
          })
        } catch(e) {
          error(`Error parsing template ${template.path}:`, true)
        }
      }
    })
  }
  saveTwigTemplates(templates, '')
}
