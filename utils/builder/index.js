const path = require('path')
const os = require('os')
const util = require('util')
const fs = require('fs')
const { get: getTemplate, searchForRenderingPlaceholder } = require('../templates')
const { get: getConfig } = require('../config')
const { load: loadApp, save } = require('../apps')
const copyAssets = require('./copyassets')
const loadElements = require('./loadElements')
const te = require('./twigExtensions')
const saveTwigTemplates = require('./twigTemplates')
const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')
const copyStaticFiles = require('./copystaticfiles')
const copyExtraFiles = require('./copyextrafiles')
const buildPage  = require('./buildpage')
const log = require('../log')
const ora = require('ora')
const chalk = require('chalk')
const humanizeDuration = require("humanize-duration")
const {spawn, execSync} = require('child_process')
const AdmZip = require("adm-zip")
const error = require('../error')
const errored = false
const { randomFillSync } = require('crypto')
const { default: axios } = require('axios')
const fmdata = require('formdata-node')

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

module.exports = {
  build: async ({ app, type = 'Development', clean = false, skip = [], only = null }) => {
    if (!only) log(`Building ${app.settings.name} in ${type} mode`, { type: 'mainTitle' })
    if (typeof aptugo !== 'undefined') aptugo.setFeedback('Setting up build...')
    const parameters = module.exports.buildParameters({ app, type, clean, variables: {}, skip })

    if (only) {
      switch (only) {
        case 'setup':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Setup...')
          return module.exports.firstStep_setupBuild(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Setup finished.')
            return 'finished setup'
          })
          break
        case 'check':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Checking your Application...')
          return module.exports.secondStep_checkApplication(parameters).then((response) => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Finished Checking your Application.')
            return 'finished check'
          }).catch(e => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Ran into an issue checking your application.', true)
            return e
          }) 
        case 'copy':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Static Files...')
          return module.exports.thirdStep_copyStaticFiles(parameters).then((res) => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Static Files finished.')
            return 'finished copy'
          }).catch(e => {
            console.log('caught eerrrorr', e)
            throw(e)
          })
          break
        case 'pages':
          if (parameters.stoped) return
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Pages and Elements...')
          return module.exports.fourthStep_generatePages(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Pages and Elements finished.')
            return 'finished pages'
          }).catch(e => {
            conosle.log('caught somethign here')
            throw(e)
          })
          break
        case 'extraFiles':
          if (parameters.stoped) return
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Files required by Elements...')
          return module.exports.fifthStep_extraFiles(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Files Required finished.')
            return 'finished extrafiles'
          })
        case 'extra':
          if (parameters.stoped) return
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Extra Settings...')
          return module.exports.fifthStep_extraSettings(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Extra Settings finished.')
            return 'finished extra'
          })
          break
        case 'post':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post Build Scripts...')
          return module.exports.sixthStep_postBuild(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post Build Scripts finished.')
            return 'finished post'
          })
          break
        case 'buildscripts':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Scripts...')
          return module.exports.seventhStep_buildScripts(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Scripts finished.')
            return 'finished buildscripts'
          })
          break
        case 'deploy':
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Deployment Started...')
          return module.exports.eightStep_deploy(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Deployment Finished!')
            return 'finished deployment'
          })
          break
      }
      return 'error' + only
    } else {
      module.exports.firstStep_setupBuild(parameters).then(() => {
        if (typeof aptugo !== 'undefined') aptugo.setFeedback('Build Setup...')
        module.exports.secondStep_checkApplication(parameters).then(() => {
          if (typeof aptugo !== 'undefined') aptugo.setFeedback('Check your Application...')
          module.exports.thirdStep_copyStaticFiles(parameters).then(() => {
            if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Static Files...')
            module.exports.fourthStep_generatePages(parameters).then(() => {
              if (typeof aptugo !== 'undefined') aptugo.setFeedback('Generate Pages...')
              module.exports.fifthStep_extraFiles(parameters).then(() => {
                if (typeof aptugo !== 'undefined') aptugo.setFeedback('Copy Files Required by Elements...')
                module.exports.fifthStep_extraSettings(parameters).then(() => {
                  if (typeof aptugo !== 'undefined') aptugo.setFeedback('Rebuild Pages with extra settings...')
                  module.exports.sixthStep_postBuild(parameters).then(() => {
                    if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post build stuff...')
                    module.exports.seventhStep_buildScripts(parameters).then(() => {
                      if (typeof aptugo !== 'undefined') aptugo.setFeedback('Post build scripts...')
                      module.exports.lastStep_success(parameters).then(() => {
                        if (typeof aptugo !== 'undefined') aptugo.setFeedback('done')
                        // finished
                      }) 
                    })
                  })
                })
              })
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
    application.tables.forEach(table => aptugocli.plain[table.unique_id] = table)
    application.assets.forEach(asset => {
      aptugocli.plain[asset.id] = asset
      aptugocli.plainAssets[asset.id] = asset
    })
    
    const navigateAndParseTree = (tree) => {
      return tree.map(item => {
        aptugocli.plain[item.unique_id] = item
        if (item.type === 'page') {
          Object.keys(item).map(propertyName => {
            if (item[propertyName] && item[propertyName].substr && item[propertyName].substr(0,2) === '()') {
              let replacedValue = item[propertyName].replace('aptugo.store.getState().application.tables','params.plainTables')
              replacedValue = '(params)' + replacedValue.substr(2)
              item[propertyName] = module.exports.parseToString(replacedValue) 
            }
          })
        }
        if (item.children && item.children.length) item.children = navigateAndParseTree(item.children)
        return item
      })
    }
    application.pages = navigateAndParseTree(application.pages)
    return application
  },

  parseToString(input) {
    let output = ''
    try {
      const params = {
        plainTables: Object.values(aptugocli.plain)
      }
      output = module.exports.deserializeFunction(input).call({})(params)
    } catch(e) {
      console.error(e)
      output = input
    }
    return output
  },

  deserializeFunction(funcString) {
    if (!aptugo) var aptugo = aptugocli
    return new Function('builder', `return ${funcString}`)
  },

  buildParameters: (buildData) => {
    const application = module.exports.parseApplication(loadApp(buildData.app))
    // console.log(util.inspect(application, false, null, true /* enable colors */))
    const settings = buildData.type === 'Development' ? application.settings.development : application.settings.production
    const template = getTemplate(settings.template)
    const buildFolder = settings.folder
    const fullbuildfolder = getConfig('folders').build
    const appFolder =  path.join( getConfig('folders').applications, aptugocli.friendly(application.settings.name) )
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
  },

  firstStep_setupBuild: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Setting up build...').start()
      aptugocli.extraSettings = parameters.variables || {}
      if (parameters.doClean) {
        fs.rmdirSync( path.join(parameters.fullbuildfolder, parameters.buildFolder), { recursive: true })
      }
      aptugocli.createIfDoesntExists(path.join(parameters.fullbuildfolder, parameters.buildFolder))

      aptugocli.skipSettings = true
      aptugocli.filesWithExtraSettings = []
      aptugocli.filesRequiredByElements = []
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
      spinner.succeed(`Build set-up: ${humanizeDuration(end - start)}`);
      resolve()
    })
  },

  secondStep_checkApplication: (parameters) => {
    return new Promise((resolve, reject) => {
      try {
        // Check Tables
        const tables = parameters.application.tables
        tables.forEach(table => {
          table.fields.forEach(field => {
            const definition = parameters.template.fields.find(tplfield => tplfield.value === field.data_type)
            if (!definition) throw { element: field, error: 'nodefinition', type: 'field' }
            
            definition.options && definition.options.extra && definition.options.extra.forEach(extraDefinition => {
              if (extraDefinition.isrequired && !field[extraDefinition.value]) throw { element: field, error: 'missingrequired', type: 'field' }
            })
          })
        })
        resolve()
      } catch(e) {
        const theError = { exitCode: 124, message: 'something fishy', element: e.element, type: e.type || 'element' }
        if (e.error === 'missingrequired') theError.message = `${e.element.column_name} has unfilled required definitions`
        else if (e.error === 'nodefinition') theError.message = `Your template does not support fields of type: ${e.element.data_type}`
        reject(theError)
      }
    })
  },

  thirdStep_copyStaticFiles: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Copying static files...\n').start()
      spinner.stream = process.stdout

      if (parameters.skip.indexOf('copy') === -1) {
        try {
          copyAssets(parameters)
          copyStaticFiles(parameters)
        } catch(e) {
          console.log('------ caughtya!!!')
          reject()
        }
        
        const end = new Date()
        spinner.succeed(`Static files copied: ${humanizeDuration(end - start)}`);
      } else {
        const end = new Date()
        spinner.info(`Static files skiped: ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  fourthStep_generatePages: (parameters) => {
    return new Promise((resolve, reject) => {
      try {
        const start = new Date()
        const spinner = ora('Generating pages...\n').start()
        spinner.stream = process.stdout

        if (parameters.skip.indexOf('pages') === -1) {
          aptugocli.generationFolder = parameters.template.renderingFolder ? path.join(parameters.buildFolder, parameters.template.renderingFolder ) : searchForRenderingPlaceholder(parameters.template.files, parameters.buildFolder)
          parameters.application.pages.forEach(page => {
            buildPage(page, parameters)
          })
          const end = new Date()
          spinner.succeed(`Pages generated: ${humanizeDuration(end - start)}`);
        } else {
          const end = new Date()
          spinner.info(`Pages generation skiped: ${humanizeDuration(end - start)}`)
        }
        resolve()
      } catch(e) {
        console.log('wellll, how the turntables', e)
      }
    })
  },

  fifthStep_extraFiles: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Copying extra files from elements...\n').start()
      spinner.stream = process.stdout
      if (parameters.skip.indexOf('extraFiles') === -1) {
        copyExtraFiles({ ...parameters, files: aptugocli.filesRequiredByElements })
        const end = new Date()
        spinner.info(`Extra Files copied: ${humanizeDuration(end - start)}`)
      } else {
        const end = new Date()
        spinner.info(`Extra Files from elements skiped: ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  fifthStep_extraSettings: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Re-Generating pages with extra settings...\n').start()
      spinner.stream = process.stdout
      if (parameters.skip.indexOf('copy') === -1) {
        aptugocli.skipSettings = false
        copyStaticFiles({ ...parameters, files: aptugocli.filesWithExtraSettings })
        const end = new Date()
        spinner.succeed(`Static files re-generated: ${humanizeDuration(end - start)}`);
      } else {
        const end = new Date()
        spinner.info(`Static files skiped (2nd pass): ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  sixthStep_postBuild: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Running post-build commands...\n').start()
      spinner.stream = process.stdout

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
            // that.helper.error(`${data.toString()} ERRROR`, data.toString())
            // reject(data.toString())
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
              spinner.succeed(`Post build comands finished: ${humanizeDuration(end - start)}`);
              resolve()     
            }
          })
        } else {
          const end = new Date()
          spinner.succeed(`No post build commands to run: ${humanizeDuration(end - start)}`);
          resolve()
        }
      } else {
        const end = new Date()
        spinner.info(`Post build commands skiped: ${humanizeDuration(end - start)}`);
        resolve()
      }
    })
  },

  seventhStep_buildScripts: (parameters) => {
    return new Promise((resolve, reject) => {
      var isWin = process.platform === "win32"
      // FIX PATH
      let returnValue = {}
      try {
        const result = execSync(`${ os.userInfo().shell} -ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`).toString()
        for (const line of result.split('\n').filter(line => Boolean(line))) {
          const [key, ...values] = line.split('=');
          returnValue[key] = values.join('=');
        }
      } catch(e) {
      }
      if (returnValue.PATH) process.env.PATH = returnValue.PATH

      const start = new Date()
      const spinner = ora('Running post-build scripts...\n').start()
      spinner.stream = process.stdout

      if (parameters.skip.indexOf('post') === -1) {
        let command = null
        const folders = getConfig('folders')
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
          const baseFilesFolder = path.join(parameters.fullbuildfolder, parameters.buildFolder)
          const child = spawn(`cd ${baseFilesFolder} && ${command}`, {
            shell: true
          })

          child.stderr.on('data', function (data) {
            console.log(data.toString())
            // that.helper.error(`${data.toString()} ERRROR`, data.toString())
            // reject(data.toString())
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
              spinner.succeed(`Post build scripts finished: ${humanizeDuration(end - start)}`);
              resolve()     
            }
          })
        } else {
          const end = new Date()
          spinner.succeed(`No post build scripts to run: ${humanizeDuration(end - start)}`);
          resolve()
        }
      } else {
        const end = new Date()
        spinner.info(`Post build scripts skiped: ${humanizeDuration(end - start)}`);
        resolve()
      }
    })
  },

  eightStep_deploy: (parameters) => {
    // zip front-end
    let zipFilesFolder = path.join(parameters.fullbuildfolder, parameters.buildFolder, 'build')
    let saveTo = path.join(os.tmpdir(), 'aptugo', `aptugoapp-build-${random()}.zip`)
    var zip = new AdmZip()

    let dirFiles = fs.readdirSync(zipFilesFolder)
    dirFiles.forEach((file) => {
      if(fs.lstatSync(path.join(zipFilesFolder, file)).isDirectory()) {
        console.log('...adding directory', file)
        zip.addLocalFolder(path.join(zipFilesFolder, file), file)
      } else {
        console.log('...adding file', file)
        zip.addLocalFile(path.join(zipFilesFolder, file))
      }
     })

    zip.writeZip(saveTo)
    
    
    // post
    const url = aptugocli.friendly(parameters.application.settings.name)
    const buffer = zip.toBuffer()
    const data = new FormData();
    const blob = new Blob([buffer],{type : 'multipart/form-data'});
    data.append('data', blob);
    const options = {
      url: 'https://appuploader.aptugo.app:8500?appName=' + url,
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      data
    };
    
    axios(options)
      .then(response => {
        console.warn('uploaded', response)
      })
      .catch(error => {
        console.warn('erorr uploading', error)
    
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
    const bebuffer = zipbe.toBuffer()
    const bedata = new FormData();
    const beblob = new Blob([bebuffer],{type : 'multipart/form-data'});
    bedata.append('data', beblob);
    const beoptions = {
      url: 'https://appuploader.aptugo.app:8500?type=be&appName=' + parameters.settings.apiURL.substring(8),
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      data: bedata
    }
    
    axios(beoptions)
      .then(response => {
        console.warn('uploaded', response)
      })
      .catch(error => {
        console.warn('erorr uploading', error)
    
      })
  },

  lastStep_success: (parameters) => {
    return new Promise((resolve, reject) => {
      const fromcommandline = !!require.main
      if (fromcommandline) {
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
      }
      resolve()
    })
  }
}
