const rdl = require('readline')
const chalk = require("chalk")
const mainTitle = chalk.hex('#FF603D').bold
const mainTitleSub = chalk.hex('#FF603D')
const promptHeader = chalk.keyword('orange')
const typeTitle = chalk.bold.red
const typeSubtitle = chalk.yellow
const typeSubtitleB = chalk.blue
const softwarning = chalk.keyword('gray')
const warning = chalk.keyword('red')

const debugElement = null
module.exports = (message, options) => {
  let output = ''
  let func = 'log'
  let text = ''
  if (!options.verbosity) options.verbosity = 1
  if (options.level) output = ' '.repeat(options.level * 2)

  if (options.type === 'mainTitle') output += `${mainTitle('Aptugo:')} ${mainTitleSub(message)}`
  else if (options.type === 'promptHeader') output += `${promptHeader(message)}`
  else if (options.type === 'softwarning') output += `${softwarning(message)}`
  else if (options.type === 'warning') output += `${warning(message)}`
  else if (options.type === 'title') output += `${typeTitle(message)}`
  else if (options.type === 'subtitle') output += `${typeSubtitle(message)}`
  else if (options.type === 'subtitle2') output += `${typeSubtitleB(message)}`
  else output += `${message}`

  
  if (options.verbosity <= aptugocli.loglevel || (debugElement && options.id === debugElement)) {
    if (options.verbosity === 1) {
      func = 'info'
      text = output
    } else {
      func = 'log'
      text = `${output} (${options.verbosity})`
    }
    // if (typeof aptugo !== 'undefined') aptugo.setFeedback(`${output} (${options.verbosity})`)
    console[func](text)
  }  
}
