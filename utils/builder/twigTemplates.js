const { fsLoadAndParseFile } = require('../templates')
const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')
const error = require('../error')

module.exports = (templates) => {
  saveTwigTemplates = (templates, preset = '') => {
    templates.forEach(template => {
      if (template.type === 'folder') {
        saveTwigTemplates(template.children, `${preset}${template.path}`)
      } else {
        const [,fileSource] = fsLoadAndParseFile(template.unique_id)
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