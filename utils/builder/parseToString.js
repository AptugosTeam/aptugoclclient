function parseToString(input) {
  let output = ''
  try {
    const params = {
      plainTables: Object.values(aptugocli.plain)
    }
    output = deserializeFunction(input).call({})(params)
  } catch(e) {
    const theError = { exitCode: 125, message: 'Element parameters error', error: e, info: input}
    throw(theError)
  }
  return output
}

function deserializeFunction(funcString) {
  return new Function('builder', `return ${funcString}`)
}

module.exports = parseToString
