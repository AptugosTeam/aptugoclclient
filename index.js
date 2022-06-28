import minimist from "minimist"
import checkLicense from './utils/checkLicense.js'
import config from './utils/config.js'
import log from './utils/log.js'

import { default as configCmds } from './cmds/config.js'
import state from './cmds/state.js'
import help from './cmds/help.js'
import { default as newApp } from './cmds/new.js'
import build from './cmds/build.js'
import version from './cmds/version.js'

import fs from 'fs'
import os from 'os'
import path from 'path'
var splitargs = import('splitargs')
import prettier from 'prettier'
import parserTypeScript from 'prettier/parser-typescript.js'
import parserBabel from 'prettier/parser-babel.js'
import parserScss from 'prettier/parser-postcss.js'
import organizeImports from 'prettier-plugin-organize-imports'
import { isBinary } from 'istextorbinary'

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
      console.error('Could not prettify error:', filename, e)
      log(`Could not prettify file ${filename} using ${parser}`, { type: 'warning' })
    }
    return toReturn
  },
  readFile: (path) => {
    console.error('reading file at ', path)
    if ( isBinary(path) ) {
      console.error('reading binary file at ', path)
      return fs.readFileSync(path)
    } else {
      console.error('reading text file at ', path)
      return fs.readFileSync(path, { encoding: 'utf-8'})
    }

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
  },
  run: async (thearguments, extraarguments = {}) => {
    let args = { _:[] }

    if (typeof(thearguments) === 'string') args = minimist(splitargs(thearguments))
    else if (typeof(thearguments) === 'object') args = { _:[], ...thearguments}
    else args = minimist(process.argv.slice(2))

    if (args.log === 'file') import('./saveLogs.js')

    let cmd = args._[0] || 'help'
    let subcmd = args

    if (args.version || args.v) cmd = 'version'
    if (args.help || args.h) cmd = 'help'

    if (args.loglevel && args.loglevel !== aptugocli.loglevel) {
      console.debug(`Setting loglevel to ${args.loglevel}`)
      aptugocli.loglevel = args.loglevel
    }

    return await checkLicense().then((result) => {
      try {
        let output = ''

        if (cmd !== 'config' && cmd !== 'utils') {
          const checkResult = config.check()
          if (checkResult !== 0) {
            output = {
              exitCode: 10,
              data: 'Missing Config'
            }
          }
        }

        switch (cmd) {
          case 'state':
            output = state(subcmd, extraarguments)
            break

          case 'control':
            output = import('./cmds/control')(subcmd)
            break

          case 'config':
            output = configCmds(subcmd)
            break

          case 'version':
            output = version(subcmd)
            break

          case 'help':
            output = help(subcmd)
            break

          case 'list':
            output = import('./cmds/list')(subcmd)
            break

          case 'load':
            output = import('./cmds/load')(subcmd)
            break

          case 'new':
            output = newApp(subcmd)
            break

          case 'save':
            output = import('./cmds/save')(subcmd, extraarguments)
            break

          case 'elements':
            output = import('./cmds/elements')(subcmd)
            break

          case 'model':
            output = import('./cmds/model')(subcmd)
            break

          case 'remove':
            output = import('./cmds/remove')(subcmd)
            break

          case 'build':
            output = build(subcmd)
            break

          case 'structures':
            output = import('./cmds/structures')(subcmd, extraarguments)
            break

          case 'templates':
            output = import('./cmds/templates')(subcmd, extraarguments)
            break
          case 'assets':
            output = import('./cmds/assets')(subcmd, extraarguments)
            break
          case 'renderer':
            output = import('./cmds/renderer')(subcmd)
            break
          case 'utils':
            if (subcmd._.slice(2).length) {
              output = aptugocli[subcmd._[1]].apply(this, subcmd._.slice(2))
            }
            break
          default:
            output = `"${cmd}" is not a valid command`
            break
        }

        if (output instanceof Promise) {
          return output.then(res => {
            if (!res) {
              return {
                exitCode: 255,
                data: 'No output produced'
              }
            } else if (res.exitCode) {
              console.log('there also')
              return res
            } else {
              if (args.pipe) return console.log(JSON.stringify(res))
              else {
                return {
                  exitCode: 0,
                  data: res
                }
              }
            }
          }).catch(e => {
            const theError = e.exitCode ? e : { exitCode: 1, message: 'General Error', error: e }
            throw(theError)
          })
        } else {
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
      throw(error)
    })
  }
}

process.on('unhandledRejection', (reason, p) => {
  console.trace('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

export default aptugocli.run
