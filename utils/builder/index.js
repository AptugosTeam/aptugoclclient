const path = require('path')
const os = require('os')
const util = require('util')
const fs = require('fs')
const { Blob } = require('buffer')

const twigPkg = require('twig/twig.js')
const { extendFilter, extendFunction, twig: _twig, cache } = twigPkg

const apps = require('../apps.js')
const templates = require('../templates.js')

const { stateSync: loadState, setState: updateState } = require('../state.js')
const config = require('../config.js')
const copyAssets = require('./copyassets.js')
const loadElements = require('./loadElements.js')
const te = require('./twigExtensions.js')
const saveTwigTemplates = require('./twigTemplates.js')
const copyStaticFiles = require('./copystaticfiles.js')
const copyExtraFiles = require('./copyextrafiles.js')
const buildPage  = require('./buildpage.js')
const log = require('../log.js')
const ora = require('ora')
const chalk = require('chalk')
const humanizeDuration = require('humanize-duration')
const parseToString = require('./parseToString')
const {spawn, execSync} = require('child_process')
const AdmZip = require('adm-zip')
const FormData = require('form-data')
const error = require('../error.js')
const errored = false
const { randomFillSync } = require('crypto')
const axios = require('axios')
const fmdata = require('formdata-node')
const fixPath = require('./paths/fixPath.js')

const random = (() => {
  const buf = Buffer.alloc(16)
  return () => randomFillSync(buf).toString('hex')
})()

const twigExtensions = () => {
  extendFunction('parse', te.parse)
  extendFunction('includeTemplate', te.includeTemplate)
  extendFunction('insert_setting', te.insertSetting)
  extendFunction('save_delayed', te.saveDelayed)
  extendFunction('add_setting', te.addSetting)
  extendFunction('envVar', te.envVar)

  extendFilter('elementData', te.elementData)
  extendFilter('fieldData', te.fieldData)
  extendFilter('removeExtension', te.removeExtension)
  extendFilter('plain', te.plain)
  extendFilter('tableData', te.tableData)
  extendFilter('assetData', te.assetData)
  extendFilter('castToArray', te.castToArray)

  extendFilter('camelCase', function(value, params) {
    return value.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
      if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    })
  })

  extendFilter('friendly', function(value, params) {
    return value ? value.replace(/[^a-zA-Z0-9]/g, "") : ''
  })

  extendFilter('functionOrCall', function(value) {
    if (!value) return ''
    if (/^\([a-zA-Z ,]*\) => {/.exec(value)) return value
    if (/^[a-zA-Z0-9]*$/.exec(value)) return value
    return '(e) => {\n' + value + '\n}'
  })
  extendFilter('textOrVariable', function(value) {
    if (!value) return ''
    if (typeof value === "number") return `"${value}"`
    if (/\${.*}/.exec(value)) return "{`" + value + "`}"
    else if (value.substr(0,1) === '{') return value
    else if (value.substr(0,4) === 'var:') return value.substr(4)
    else return `"${value}"`
  })

  extendFilter('withoutVars', te.withoutVars)

  // extendFilter('parentPage', function(value) {
  //   const parentsTree = getCascadingTree(builderObj.plainPages, value.unique_id)
  //   return parentsTree
  // })

}

const builder = {
  build: async (prefs) => {
    const { app, type = 'Development', clean = false, skip = [], only = null } = prefs

    if (!only) log(`Building ${app.settings.name} in ${type} mode`, { type: 'mainTitle' })
    let parameters
    try {
      parameters = builder.buildParameters({ app, type, clean, variables: {}, skip })
    } catch(e) {
      throw(e)
    }

    if (only) {
      switch (only) {
        case 'setup':
          return builder.firstStep_setupBuild(parameters).then(() => {
            return 'finished setup'
          }).catch(e => {
            console.log('caught Error on SetupBuild', e)
          })
          break
        case 'check':
          return builder.secondStep_checkApplication(parameters).then((response) => {
            return 'finished check'
          }).catch(e => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Ran into an issue checking your application.', true)
            return e
          })
        case 'copy':
          return builder.thirdStep_copyStaticFiles(parameters).then((res) => {
            return 'finished copy'
          }).catch(e => {
            console.log('Caught Error on Copy Static Files', e)
          })
          break
        case 'pages':
          if (parameters.stoped) return
          return builder.fourthStep_generatePages(parameters).then(() => {
            return 'finished pages'
          }).catch(e => {
            throw(e)
          })
          break
        case 'extraFiles':
          if (parameters.stoped) return
          return builder.fifthStep_extraFiles(parameters).then(() => {
            return 'finished extrafiles'
          })
        case 'extra':
          if (parameters.stoped) return
          return builder.fifthStep_extraSettings(parameters).then(() => {
            return 'finished extra'
          })
          break
        case 'post':
          return builder.sixthStep_postBuild(parameters).then(() => {
            return 'finished post'
          })
          break
        case 'buildscripts':
          return builder.seventhStep_buildScripts(parameters).then(() => {
            return 'finished buildscripts'
          })
          break
        case 'deploy':
          return builder.eightStep_deploy(parameters).then(() => {
            return 'finished deployment'
          }).catch(e => {
            console.log('step 8: Error', e)
            throw(e)
          })
          break
      }
      return 'error' + only
    } else {
      builder.firstStep_setupBuild(parameters).then(() => {
        if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Setup...')
        builder.secondStep_checkApplication(parameters).then(() => {
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Check your Application...')
          builder.thirdStep_copyStaticFiles(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Static Files...')
            builder.fourthStep_generatePages(parameters).then(() => {
              if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Pages...')
              builder.fifthStep_extraFiles(parameters).then(() => {
                if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Files importd by Elements...')
                builder.fifthStep_extraSettings(parameters).then(() => {
                  if (typeof aptugo !== 'undefined') aptugo.setFeedback('Rebuild Pages with extra settings...')
                  builder.sixthStep_postBuild(parameters).then(() => {
                    if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post build stuff...')
                    builder.seventhStep_buildScripts(parameters).then(() => {
                      if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post build scripts...')
                      builder.lastStep_success(parameters).then(() => {
                        if (typeof aptugo !== 'undefined') aptugo.setFeedback('done')
                        // finished
                      })
                    })
                  })
                })
              })
            }).catch(e => { // Failed generate pages
              throw(e)
            })
          })
        })
      })
      return 'built full'
    }
  },

  stopBuilding: (parameters) => {
    errored = true
    parameters.stoped = true
  },

  parseApplication: (application) => {
    try {
      application.tables.forEach(table => aptugocli.plain[table.unique_id] = table)
      application.assets.forEach(asset => {
        aptugocli.plain[asset.id] = asset
        aptugocli.plainAssets[asset.id] = asset
      })

      const navigateAndParseTree = (tree) => {
        return tree.map(item => {
          aptugocli.plain[item.unique_id] = item
          if (item.type === 'page') {
            // aptugocli.plain[page.unique_id] = item
            // aptugocli.plainPages[page.unique_id] = item
            Object.keys(item).map(propertyName => {
              if (item[propertyName] && item[propertyName].substr && item[propertyName].substr(0,2) === '()') {
                let replacedValue = item[propertyName].replace('aptugo.store.getState().application.tables','params.plainTables')
                replacedValue = replacedValue.replace('aptugo.activeApplication.tables','params.plainTables')
                replacedValue = '(params)' + replacedValue.substr(2)
                item[propertyName] = parseToString(replacedValue)
              }
            })
          }
          if (item.children && item.children.length) item.children = navigateAndParseTree(item.children)
          return item
        })
      }
      application.pages = navigateAndParseTree(application.pages)
      return application
    } catch(e) {
      throw(e)
    }
  },

  buildParameters: (buildData) => {
    try {
      const application = builder.parseApplication(apps.load(buildData.app))

      // console.log(util.inspect(application, false, null, true /* enable colors */))
      const settings = buildData.type === 'Development' ? application.settings.development : application.settings.production
      const template = templates.get(settings.template)
      const buildFolder = settings.folder
      const fullbuildfolder = config.get('folders').build
      const appFolder =  path.join( config.get('folders').applications, aptugocli.friendly(application.settings.name) )
      const filesFolder = path.join(appFolder, 'Drops')

      settings.variables && settings.variables.split('\n').forEach(thevar => {
        var [varName, varValue] = thevar.split(':')
        try { buildData.variables[varName] = eval(varValue) } catch(e) { buildData.variables[varName] = varValue }
      })

      if (!template) error('Error: Application does not have a template assigned (or it is missing)', true)

      aptugocli.activeParameters = {
        stoped: false,
        skip: buildData.skip,
        type: buildData.type,
        application,
        settings,
        template,
        buildFolder,
        appFolder,
        fullbuildfolder,
        filesFolder,
        method: settings.type,
        doClean: buildData.clean,
        variables: buildData.variables
      }

      return aptugocli.activeParameters
    } catch(e) {
      throw(e)
    }
  },

  firstStep_setupBuild: (parameters) => {
    return new Promise((resolve, reject) => {
      const state = loadState()
      const start = new Date()
      console.info('Setting up build...')
      console.log(parameters.variables)
      updateState({ ...state, filesWithExtraSettings: [], extraSettings: [] })
      if (parameters.doClean) {
        fs.rmdirSync( path.join(parameters.fullbuildfolder, parameters.buildFolder), { recursive: true })
      }
      aptugocli.createIfDoesntExists(path.join(parameters.fullbuildfolder, parameters.buildFolder))

      aptugocli.skipSettings = true
      aptugocli.filesimportdByElements = []
      cache(false)
      twigExtensions()
      _twig({
        id: 'empty',
        allowInlineIncludes: true,
        data: '',
        rethrow: true
      })

      const elementsFolder = parameters.template.files.filter(file => file.path === 'elements' || file.path === 'templatescripts')[0]
      if (!elementsFolder) error('ERROR IN TEMPLATE: Template does not contain an elements folder', false)
      else {
        aptugocli.loadedElements = loadElements(elementsFolder.children)
        saveTwigTemplates(elementsFolder.children)
      }
      aptugocli.assets = parameters.application.assets
      const end = new Date()
      console.info(`Build set-up: ${humanizeDuration(end - start)}`)
      resolve()
    })
  },

  secondStep_checkApplication: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      console.info('Checking your application...')
      try {
        // Check Tables
        const tables = parameters.application.tables
        tables.forEach(table => {
          if ( aptugocli.friendly(table.name) === aptugocli.friendly(table.singleName) ) {
            throw { element: table, error: 'tablenamesame', type: 'table' }
          }

          table.fields.forEach(field => {
            const definition = parameters.template.fields.find(tplfield => tplfield.value === field.data_type)
            if (!definition) throw { element: field, error: 'nodefinition', type: 'field' }

            definition.options && definition.options.extra && definition.options.extra.forEach(extraDefinition => {
              if (extraDefinition.isimportd && !field[extraDefinition.value]) throw { element: field, error: 'missingimportd', type: 'field' }
            })
          })
        })

        // Check Elements
        const elements = Object.values(aptugocli.plain).filter(plainThing => plainThing.type === 'element')
        console.log('aptugo cli exists?')
        // console.log(aptugocli)
        elements.forEach(element => {
          const broughtElement = aptugocli.loadedElements.find(item => item.path === `${element.value}.tpl`)
          if (broughtElement) {
            broughtElement.options && broughtElement.options.forEach(option => {
              if (option.importd && !element.values[option.name]) throw { element: element, error: 'missingimportd', type: 'element' }
            })
          } else {
            throw { element: element, error: 'missingtemplate', type: 'element' }
          }

        })
        const end = new Date()
        console.info(`Finished checking your application: ${humanizeDuration(end - start)}`)
        resolve()
      } catch(e) {
        const theError = { exitCode: 124, message: 'Something fishy', element: e.element, type: e.type || 'element' }
        if (e.error === 'tablenamesame') theError.message = `${e.element.name} can not have the same name for Single Values`
        else if (e.error === 'missingimportd') {
          if (e.type === 'field') theError.message = `${e.element.column_name} has unfilled importd definitions`
          else theError.message = `${e.element.name} has unfilled importd definitions`
        } else if (e.error === 'nodefinition') theError.message = `Your template does not support fields of type: ${e.element.data_type}`
        else if (e.error === 'missingtemplate') theError.message = `Your template does not support elements of type: ${e.element.value}`
        console.warn(theError)
        reject(theError)
      }
    })
  },

  thirdStep_copyStaticFiles: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      console.info('Copying static files...')

      if (parameters.skip.indexOf('copy') === -1) {
        try {
          copyAssets(parameters)
          copyStaticFiles(parameters)
          const end = new Date()
          console.info(`Static files copied: ${humanizeDuration(end - start)}`)
          resolve()
        } catch(e) {
          const theError = {
            exitCode: 120,
            message: 'Missing Asset File',
            error: e
          }
          console.warn(theError)
          reject(theError)
        }
      } else {
        const end = new Date()
        console.info(`Static files skiped: ${humanizeDuration(end - start)}`)
        resolve()
      }
    })
  },

  fourthStep_generatePages: (parameters) => {
    return new Promise((resolve, reject) => {
      if (parameters.skip.indexOf('pages') !== -1) {
        console.info(`Pages generation skiped`)
      } else {
        const start = new Date()
        console.info('Generating pages...')
        aptugocli.generationFolder = parameters.template.renderingFolder ? path.join(parameters.buildFolder, parameters.template.renderingFolder ) : templates.searchForRenderingPlaceholder(parameters.template.files, parameters.buildFolder)
        parameters.application.pages.forEach(page => {
          try {
            buildPage(page, parameters)
          } catch(e) {
            const theError = e.exitCode ? e : { exitCode: 123, message: 'Rude, condescending, and a little bit snotty error', element: page, type: 'page', error: e }
            reject(theError)
          }
        })
        const end = new Date()
        console.info(`Pages generated: ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  fifthStep_extraFiles: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Copying extra files from elements...\n').start()
      if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copying extra files from elements...\n')
      spinner.stream = process.stdout
      if (parameters.skip.indexOf('extraFiles') === -1) {
        copyExtraFiles({ ...parameters, files: aptugocli.filesimportdByElements })
        const end = new Date()
        spinner.info(`Extra Files copied: ${humanizeDuration(end - start)}`)
        if (typeof aptugo !== 'undefined') aptugo.setFeedback(`Extra Files copied: ${humanizeDuration(end - start)}`)
      } else {
        const end = new Date()
        spinner.info(`Extra Files from elements skiped: ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  fifthStep_extraSettings: (parameters) => {
    return new Promise((resolve, reject) => {
      const state = loadState()
      const start = new Date()
      console.info('Re-Generating pages with extra settings...')
      if (parameters.skip.indexOf('copy') === -1) {
        aptugocli.skipSettings = false
        copyStaticFiles({ ...parameters, files: state.filesWithExtraSettings })
        const end = new Date()
        console.info(`Static files re-generated: ${humanizeDuration(end - start)}`)
      } else {
        const end = new Date()
        console.info(`Static files skiped (2nd pass): ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  sixthStep_postBuild: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      console.info('Running post-build commands...')
      if (parameters.skip.indexOf('post') === -1) {
        const tca = parameters.type === 'Development' ? parameters.template.templateCommandsAfter : parameters.template.templateCommandsAfterDeploy
        if (tca) {
          var template = _twig({ data: tca, rethrow: true })
          const renderedCommands = template.render(parameters)
          const baseFilesFolder = path.join(parameters.fullbuildfolder, parameters.buildFolder)
          console.log('rendered commands', renderedCommands)
          const child = spawn(`cd ${baseFilesFolder} && ${renderedCommands}`, {
            shell: true
          })

          child.stderr.on('data', function (data) {
            console.log(data.toString())
          })

          child.stdout.on('data', function (data) {
            log(data.toString(), { verbosity: 8 })
          })

          child.on('exit', function (exitCode) {
            if (exitCode > 0) {
              console.log(`Child exited with code: ${exitCode}`, exitCode)
              // reject({ message: 'Postbuild Finished with code: ' + exitCode, error: exitCode })
            } else {
              const end = new Date()
              console.info(`Post build comands finished: ${humanizeDuration(end - start)}`);
              resolve()
            }
          })
        } else {
          const end = new Date()
          console.info(`No post build commands to run: ${humanizeDuration(end - start)}`)
          resolve()
        }
      } else {
        const end = new Date()
        console.info(`Post build commands skiped: ${humanizeDuration(end - start)}`)
        resolve()
      }
    })
  },

  seventhStep_buildScripts: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      console.info('Running post-build scripts...', parameters)
      var isWin = process.platform === "win32"
      // FIX PATH
      let returnValue = {}
      try {
        let result = execSync(`${ os.userInfo().shell} -ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`)
        if (result) result = result.toString()
        for (const line of result.split('\n').filter(line => Boolean(line))) {
          const [key, ...values] = line.split('=');
          returnValue[key] = values.join('=');
        }
      } catch(e) {}
      if (returnValue.PATH) process.env.PATH = returnValue.PATH
      let precommand = ''
      Object.keys(parameters.variables).forEach(avar => {
        if (avar.substring(0,4) === 'ENV.') {
          precommand += `export ${avar.substring(4)}=${parameters.variables[avar]} &&`
        }
      })
      if (parameters.skip.indexOf('post') === -1) {
        let command = null
        const folders = config.get('folders')
        if (parameters.type === 'Development') {
          const scriptFolder = path.join(folders.templates, parameters.settings.template, 'templatescripts', isWin ? 'development.bat' : 'development.sh')
          if ( fs.existsSync( scriptFolder ) ) {
            command = scriptFolder
          }
        } else {
          const scriptFolder = path.join(folders.templates, parameters.settings.template, 'templatescripts', isWin ? 'production.bat' : 'production.sh')
          if ( fs.existsSync( scriptFolder ) ) {
            command = scriptFolder
          }
        }
        if (command) {
          fixPath()
          const baseFilesFolder = path.join(parameters.fullbuildfolder, parameters.buildFolder)
          const child = spawn(`${precommand} cd ${baseFilesFolder} && ${command}`, {
            shell: true,
            env: {
              PATH: process.env.PATH
            }
          })

          child.stderr.on('data', function (data) {
            reject({ message: `Template build scripts (${command}) raised some concerns`, exitCode: 130, error: data.toString() })
          })

          child.stdout.on('data', function (data) {
            log(data.toString(), { verbosity: 8 })
          })

          child.on('exit', function (exitCode) {
            if (exitCode > 0) {
              console.error(`Child exited with code: ${exitCode}`)
              reject({ message: 'Postbuild Finished with code: ' + exitCode, error: exitCode })
            } else {
              const end = new Date()
              console.info(`Post build scripts finished: ${humanizeDuration(end - start)}`);
              resolve()
            }
          })
        } else {
          const end = new Date()
          console.info(`No post build scripts to run: ${humanizeDuration(end - start)}`);
          resolve()
        }
      } else {
        const end = new Date()
        console.info(`Post build scripts skiped: ${humanizeDuration(end - start)}`)
        resolve()
      }
    })
  },

  eightStep_deploy: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      console.info('Starting Deployment...')

      // zip front-end
      let zipFilesFolder = path.join(parameters.fullbuildfolder, parameters.buildFolder, 'build')
      let saveTo = path.join(os.tmpdir(), 'aptugo', `aptugoapp-build-${random()}.zip`)
      console.log(AdmZip)
      var zip = new AdmZip()

      let dirFiles = fs.readdirSync(zipFilesFolder)
      dirFiles.forEach((file) => {
        if(fs.lstatSync(path.join(zipFilesFolder, file)).isDirectory()) {
          log(`Adding directory: ${file}`, { verbosity: 9 })
          zip.addLocalFolder(path.join(zipFilesFolder, file), file)
        } else {
          log(`Adding file: ${file}`, { verbosity: 10 })
          zip.addLocalFile(path.join(zipFilesFolder, file))
        }
      })
      log(`Zip file written`, { verbosity: 7 })
      zip.writeZip(saveTo)

      // post
      const url = parameters.settings.url.substring(8).toLowerCase()
      const buffer = zip.toBuffer()
      const form = new FormData()
      form.append('data', buffer)

      const options = {
        url: 'https://appuploader.aptugo.app:8500?appName=' + url,
        method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${form._boundary}` },
        data: form
      }

      log(`Updloading front-end to Aptugo Servers`, { verbosity: 6 })
      axios(options)
        .then(response => {
          log('Front-end uploaded', { verbosity: 7 })
        })
        .catch(error => {
          console.warn('failed uploading', error)
        })

      // zip backend
      const zipFilesFolderbe = path.join(parameters.fullbuildfolder, parameters.buildFolder, 'back-end')
      saveTo = path.join(os.tmpdir(), 'aptugo', `aptugoapp-build-backend-${random()}.zip`)
      var zipbe = new AdmZip()

      dirFiles = fs.readdirSync(zipFilesFolderbe)
      dirFiles.forEach((file) => {
        if (file !== 'node_modules') {
          if(fs.lstatSync(path.join(zipFilesFolderbe, file)).isDirectory()) {
            console.log('...adding directory', file)
            zipbe.addLocalFolder(path.join(zipFilesFolderbe, file), file)
          } else {
            console.log('...adding file', file)
            zipbe.addLocalFile(path.join(zipFilesFolderbe, file))
          }
        }
      })

      zipbe.writeZip(saveTo)

      // post back-end
      const beurl = parameters.settings.apiURL.substring(8)
      const bebuffer = zipbe.toBuffer()
      const beform = new FormData()
      beform.append('data', bebuffer)

      const beoptions = {
        url: 'https://appuploader.aptugo.app:8500?type=be&appName=' + beurl,
        method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${beform._boundary}` },
        data: beform
      }

      axios(beoptions)
        .then(response => {
          log('Back-end uploaded', { verbosity: 7 })
        })
        .catch(error => {
          console.warn('Error Uploading', error)

        })
      const end = new Date()
      console.info(`Deployment queued (might take a few minutes): ${humanizeDuration(end - start)}`)
      resolve()
    })
  },

  lastStep_success: (parameters) => {
    return new Promise((resolve, reject) => {

        process.stdout.write(chalk.hex('#FF603D')(`\n\r
        ┌────────────────────────┐
        │                        │
        │   Application Built!   │
        │                        │
        └────────────────────────┘
        Your application has been built on folder:
        ${path.join(parameters.fullbuildfolder, parameters.buildFolder)}
        `))
        process.exit(0)

      resolve()
    })
  }
}

module.exports = builder
