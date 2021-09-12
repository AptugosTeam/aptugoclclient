const chalk = require("chalk")
const minimist = require('minimist')
const log = require('./utils/log')
const checkLicense = require('./utils/checkLicense')
const ora = require('ora')
const { check } = require('./utils/config')
const fs = require('fs')

const prettier = require('prettier')
const parserTypeScript = require('prettier/parser-typescript')
const parserBabel = require('prettier/parser-babel')
const parserScss = require('prettier/parser-postcss')
const organizeImports = require('prettier-plugin-organize-imports')

global.aptugo = {
  plain: {},
  plainAssets: {},
  plainTables: {},
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
      fs.mkdirSync(folderPath, { recursive: true })
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
          log(`Could not find a good parser for file ${filename} using ${parser}`, { type: 'softwarning' })
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
      contents = aptugo.pretify(contents, pretify, filename)
    }

    try {
      fs.writeFileSync(filename, contents, {flag:'w'} )
    } catch (e) {
      console.error('error writing file', e)
    }
  }
}

module.exports = async () => {
  const args = minimist(process.argv.slice(2))

  let cmd = args._[0] || 'help'
  let subcmd = args

  if (args.version || args.v) {
    cmd = 'version'
  }

  if (args.help || args.h) {
    cmd = 'help'
  }
  // const spinner = ora('Checking License').start()
  await checkLicense()
    .then((result) => {
      // spinner.stop()
      try {
        const checkResult = check()
        if (checkResult !== 0) {
          console.error(chalk.blue.bold('Missing config'))
          cmd = 'config'
          subcmd = { _: ['config', 'ask', 'folders'] }
        }
        switch (cmd) {
          case 'config':
            require('./cmds/config')(subcmd)
            break
      
          case 'version':
            require('./cmds/version')(subcmd)
            break
      
          case 'help':
            require('./cmds/help')(subcmd)
            break
      
          case 'new':
            require('./cmds/new')(subcmd)
            break

          case 'model':
            require('./cmds/model')(subcmd)
            break
      
          case 'remove':
            require('./cmds/remove')(subcmd)
            break

          case 'build':
            require('./cmds/build')(subcmd)
            break

          case 'structures':
            require('./cmds/structures')(subcmd)
            break

          case 'templates':
            require('./cmds/templates')(subcmd)
            break
          case 'assets':
            require('./cmds/assets')(subcmd)
            break
          case 'renderer':
            require('./cmds/renderer')(subcmd)
            break
          default:
            error(`"${cmd}" is not a valid command!`, true)
            break
        }
      } catch(e) {
        console.error(e)
        error(`Failed to execute command`, true)
      }
      
    })
    .catch((error) => {
      spinner.stop()
      console.error(chalk.red.bold(error))
      cmd = 'config'
      subcmd = { _: ['ask','license'] }
      require('./cmds/config')(subcmd)
    })
}
