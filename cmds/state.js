const { state: loadState, setState } = require('../utils/state')

let state
let output
module.exports = async (args, extraarguments) => {
  switch (args._[1]) {
    case 'update':
      state = await loadState()
      setState({ ...state, app: extraarguments.file })
      output = { ...state, app: extraarguments.file }
      break
    case 'load':
      state = await loadState()
      output = state
      break
  }
  return output
}
