import templates from '../templates.js'

export default (elements) => {
  const doloadElements = (elements, preset = '') => {
    const output = []
    elements.forEach(element => {
      aptugocli.plain[element.unique_id] = element
      if (element.type === 'folder') {
        output.push( ...doloadElements(element.children, `${preset}${element.path}`))
      } else {
        const [settings,fs] = templates.fsLoadAndParseFile({ unique_id: element.unique_id })
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

  if (!aptugocli.plain) aptugocli.plain = {}
  const le = doloadElements(elements)
  return le
}
