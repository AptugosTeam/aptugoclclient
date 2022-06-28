import log from './log.js'
export default (message, exit) => {
  log(message, { type: 'error' })
  throw new Error(message)
}
