import { state as loadState, setState, getPath } from '../utils/state.js'

let state
let output
export default async (args, extraarguments) => {
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
