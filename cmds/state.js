const { state: loadState, setState, getPath } = require('../utils/state')

let state
let output
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'update':
      setState({ app: extraarguments.file })
      output = 'ok'
      break
    case 'load':
      state = await loadState()
      output = state
      break
    case 'path':
      output = await getPath()
      break
  }
  return output
}
