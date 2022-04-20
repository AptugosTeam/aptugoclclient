const chalk = require("chalk")
const minimist = require('minimist')
const checkLicense = require('./utils/checkLicense')
const ora = require('ora')
const { check } = require('./utils/config')
const fs = require('fs')
var splitargs = require('splitargs')
const log = require('./utils/log')
const prettier = require('prettier')
const parserTypeScript = require('prettier/parser-typescript')
const parserBabel = require('prettier/parser-babel')
const parserScss = require('prettier/parser-postcss')
const organizeImports = require('prettier-plugin-organize-imports')

global.aptugocli = {
  loglevel: 0,
  plain: {},
  plainAssets: {},
  plainTables: {},
  plainPages: {},
  activeParameters: {},
  extraSettings: [],
  friendly: (value) => {
    return value ? value.replace(/[^0-9a-zA-Z]/g, "") : ''
  },
  generateID: (length = 8) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('')
    let str = ''
    for (let i = 0; i < length; i++) {
      str += chars[Math.floor(Math.random() * chars.length)]
    }
    return str
  },
  createIfDoesntExists: (folderPath) => {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true, mode: 0o777 })
    }
  },
  pretify: (input, parser, filename) => {
    const ignoreExtensions = ['png','ts','htaccess','development','production','html','txt']
    if (typeof parser === 'boolean' && parser) {
      const fileExtension = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase()
      if (ignoreExtensions.indexOf(fileExtension) !== -1) return input
      switch (fileExtension) {
        case 'js':
          parser = 'babel'
          break
        case 'tsx':
          parser = 'typescript'
          break
        case 'json':
          parser = 'json'
          break
        case 'scss':
          parser = 'scss'
          break
        default:
          log(`Could not find a good parser for file ${filename} using ${parser}`, { type: 'softwarning', level: 2 })
          return input
      }
    }
    
    // return input
    let toReturn = input
    try {
      toReturn = prettier.format(input, {
        semi: false,
        parser: typeof parser === 'string' ? parser : parser && "typescript",
        singleQuote: true,
        printWidth: 150,
        filepath: filename,
        endOfLine: 'lf',
        importOrder: ["^@core/(.*)$", "^@server/(.*)$", "^@ui/(.*)$", "^[./]"],
        importOrderSeparation: true,
        plugins: [parserTypeScript, parserBabel, parserScss, organizeImports]
      })
    } catch(e) {
      log(`Could not prettify file ${filename} using ${parser}`, { type: 'warning' })
    }
    return toReturn
  },
  writeFile: (filename, contents, pretify = true) => {
    if (pretify) {
      if (filename.substr(-2) === 'js') pretify = 'babel'
      contents = aptugocli.pretify(contents, pretify, filename)
    }

    try {
      fs.writeFileSync(filename, contents, {flag:'w'} )
    } catch (e) {
      console.error('error writing file', e)
    }
  },
  ls: {
    getItem: (itemName) => {
      return 'lite'
    }
  },
  findPageInTree: (tree, unique_id) => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i].unique_id === unique_id) {
          return tree[i]
        }
        var found = aptugocli.findPageInTree(tree[i].children, unique_id)
        if (found) return found
      }
    }
  }
}

module.exports = async (arguments, extraarguments = {}) => {
  const fromcommandline = !!require.main
  let args
  if (fromcommandline) {
    args = minimist(process.argv.slice(2))
  } else {
    args = minimist(splitargs(arguments))
  }

  let cmd = args._[0] || 'help'
  let subcmd = args

  if (args.version || args.v) {
    cmd = 'version'
  }

  if (args.help || args.h) {
    cmd = 'help'
  }

  if (args.loglevel && args.loglevel !== aptugocli.loglevel) {
    console.debug(`Setting loglevel to ${args.loglevel}`)
    aptugocli.loglevel = args.loglevel
  }
  
  return await checkLicense().then((result) => {
    try {
      if (cmd !== 'config' && cmd !== 'utils') {
        const checkResult = check()
        if (checkResult !== 0) {
          if (fromcommandline) {
            console.error(chalk.blue.bold('Missing config'))
            cmd = 'config'
            subcmd = { _: ['config', 'ask', 'folders'] }
          } else {
            return 'You must config me'
          }
        }
      }
      
      let output = ''
      switch (cmd) {
        case 'control':
          output = require('./cmds/control')(subcmd)
          break

        case 'config':
          output = require('./cmds/config')(subcmd)
          break
    
        case 'version':
          output = require('./cmds/version')(subcmd)
          break
    
        case 'help':
          output = require('./cmds/help')(subcmd)
          break
    
        case 'load':
          output = require('./cmds/load')(subcmd)
          break

        case 'new':
          output = require('./cmds/new')(subcmd)
          break

        case 'elements':
          output = require('./cmds/elements')(subcmd)
          break

        case 'model':
          output = require('./cmds/model')(subcmd)
          break
    
        case 'remove':
          output = require('./cmds/remove')(subcmd)
          break

        case 'build':
          output = require('./cmds/build')(subcmd)
          break

        case 'structures':
          output = require('./cmds/structures')(subcmd)
          break

        case 'templates':
          output = require('./cmds/templates')(subcmd, extraarguments)
          break
        case 'assets':
          output = require('./cmds/assets')(subcmd, extraarguments)
          break
        case 'renderer':
          output = require('./cmds/renderer')(subcmd)
          break
        case 'utils':
          if (subcmd._.slice(2).length) {
            output = aptugocli[subcmd._[1]].apply(this, subcmd._.slice(2))
          }
          break
        default:
          output = `"${cmd}" is not a valid command!`
          break
      }
      if (output instanceof Promise) {
        return output.then(res => {
          if (!res) {
          } else if (res.exitCode) {
            if (fromcommandline) throw(res)
            else return res
          } else {
            if (fromcommandline) {
              if (args.pipe) return console.log(JSON.stringify(res))
              else if (res instanceof Array) console.log(res)
              else if (res instanceof Object) console.log(res)
              else process.stdout.write(res)
            }
            return {
              exitCode: 0,
              data: res
            }
          }
        })
      } else {
        if (fromcommandline) console.log(output)
        return {
          exitCode: 0,
          data: output
        }
      }
    } catch(e) {
      console.error(e)
      error(`Failed to execute command`, true)
    }
    
  })
  .catch((error) => {
    if (typeof aptugo !== 'undefined') aptugo.setFeedback(error.message, true)
    else console.trace('ERROR:', error)
  })
}
