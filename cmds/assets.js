const {
  fileSource: source,
} = require('../utils/assets')

const filesource = async (args) => {
  return source(args.app, args.asset)
}

module.exports = async (args) => {
  switch (args._[1]) {
    case 'load':
      console.log( await filesource(args) )
      break
  }
}
