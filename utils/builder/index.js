const path = require('path')
const os = require('os')
const util = require('util')
const fs = require('fs')
const { get: getTemplate, searchForRenderingPlaceholder } = require('../templates')
const { get: getConfig } = require('../config')
const { load: loadApp } = require('../apps')
const copyAssets = require('./copyassets')
const loadElements = require('./loadElements')
const te = require('./twigExtensions')
const saveTwigTemplates = require('./twigTemplates')
const { extendFilter, extendFunction, twig: _twig, cache } = require('twig/twig.js')
const copyStaticFiles = require('./copystaticfiles')
const buildPage  = require('./buildpage')
const log = require('../log')
const ora = require('ora')
const chalk = require('chalk')
const humanizeDuration = require("humanize-duration")
const {spawn, execSync} = require('child_process')
const error = require('../error')

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

  extendFilter('textOrVariable', function(value) {
    if (!value) return ''
    if (typeof value === "number") return `"${value}"`
    if (/\${.*}/.exec(value)) return "{`" + value + "`}"
    else if (value.substr(0,1) === '{') return value
    else return `"${value}"`
  })

  extendFilter('withoutVars', te.withoutVars)
  

  

  // extendFilter('parentPage', function(value) {
  //   const parentsTree = getCascadingTree(builderObj.plainPages, value.unique_id)
  //   return parentsTree
  // })
  
}

module.exports = {
  build: ({ app, type = 'Development', clean = false, skip = [] }) => {
    log(`Building ${app.settings.name} in ${type} mode`, { type: 'mainTitle' })
    const parameters = module.exports.buildParameters({ app, type, clean, variables: {}, skip })
    module.exports.firstStep_setupBuild(parameters).then(() => {
      module.exports.secondStep_copyStaticFiles(parameters).then(() => {
        module.exports.thirdStep_generatePages(parameters).then(() => {
          module.exports.fourthStep_extraSettings(parameters).then(() => {
            module.exports.fifthStep_postBuild(parameters).then(() => {
              module.exports.sixthStep_buildScripts(parameters).then(() => {
                module.exports.lastStep_success(parameters)
              })
            })
          })
        })
      })
    })
  },

  parseApplication: (application) => {
    application.tables.forEach(table => aptugo.plain[table.unique_id] = table)
    application.assets.forEach(asset => {
      aptugo.plain[asset.id] = asset
      aptugo.plainAssets[asset.id] = asset
    })
    
    const navigateAndParseTree = (tree) => {
      return tree.map(item => {
        aptugo.plain[item.unique_id] = item
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
        plainTables: Object.values(aptugo.plain)
      }
      output = module.exports.deserializeFunction(input).call({})(params)
    } catch(e) {
      console.error(e)
      output = input
    }
    return output
  },

  deserializeFunction(funcString) {
    return new Function('builder', `return ${funcString}`)
  },

  buildParameters: (buildData) => {
    const application = module.exports.parseApplication(loadApp(buildData.app))
    // console.log(util.inspect(application, false, null, true /* enable colors */))
    const settings = buildData.type === 'Development' ? application.settings.development : application.settings.production
    const template = getTemplate(settings.template)
    const buildFolder = settings.folder
    const fullbuildfolder = getConfig('folders').build
    const appFolder =  path.join( getConfig('folders').applications, aptugo.friendly(application.settings.name) )
    const filesFolder = path.join(appFolder, 'Drops')

    settings.variables && settings.variables.split('\n').forEach(thevar => {
      var [varName, varValue] = thevar.split(':')
      try { buildData.variables[varName] = eval(varValue) } catch(e) { buildData.variables[varName] = varValue }
    })

    if (!template) error('Error: Application does not have a template assigned (or it is missing)', true)

    aptugo.activeParameters = {
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

    return aptugo.activeParameters
  },

  firstStep_setupBuild: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Setting up build...').start()
      aptugo.extraSettings = parameters.variables || {}
      if (parameters.doClean) {
        fs.rmdirSync( path.join(parameters.fullbuildfolder, parameters.buildFolder), { recursive: true })
      }
      aptugo.createIfDoesntExists(path.join(parameters.fullbuildfolder, parameters.buildFolder))

      aptugo.skipSettings = true
      aptugo.filesWithExtraSettings = []
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
        aptugo.loadedElements = loadElements(elementsFolder.children)
        saveTwigTemplates(elementsFolder.children)
      }
      aptugo.assets = parameters.application.assets
      const end = new Date()
      spinner.succeed(`Build set-up: ${humanizeDuration(end - start)}`);
      resolve()
    })
  },

  secondStep_copyStaticFiles: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Copying static files...\n').start()
      spinner.stream = process.stdout

      if (parameters.skip.indexOf('copy') === -1) {
        copyAssets(parameters)
        copyStaticFiles(parameters)
        const end = new Date()
        spinner.succeed(`Static files copied: ${humanizeDuration(end - start)}`);
      } else {
        const end = new Date()
        spinner.info(`Static files skiped: ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },

  thirdStep_generatePages: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Generating pages...\n').start()
      spinner.stream = process.stdout

      if (parameters.skip.indexOf('pages') === -1) {
        aptugo.generationFolder = parameters.template.renderingFolder ? path.join(parameters.buildFolder, parameters.template.renderingFolder ) : searchForRenderingPlaceholder(parameters.template.files, parameters.buildFolder)
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
    })
  },

  fourthStep_extraSettings: (parameters) => {
    return new Promise((resolve, reject) => {
      const start = new Date()
      const spinner = ora('Re-Generating pages with extra settings...\n').start()
      spinner.stream = process.stdout
      if (parameters.skip.indexOf('copy') === -1) {
        aptugo.skipSettings = false
        copyStaticFiles({ ...parameters, files: aptugo.filesWithExtraSettings })
        const end = new Date()
        spinner.succeed(`Static files re-generated: ${humanizeDuration(end - start)}`);
      } else {
        const end = new Date()
        spinner.info(`Static files skiped (2nd pass): ${humanizeDuration(end - start)}`)
      }
      resolve()
    })
  },
  fifthStep_postBuild: (parameters) => {
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
            console.log(3)
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
  sixthStep_buildScripts: (parameters) => {
    return new Promise((resolve, reject) => {
      // FIX PATH
      let returnValue = {}
      const result = execSync(`${os.userInfo().shell} -ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`).toString()
      for (const line of result.split('\n').filter(line => Boolean(line))) {
        const [key, ...values] = line.split('=');
        returnValue[key] = values.join('=');
      }
      if (returnValue.PATH) process.env.PATH = returnValue.PATH

      const start = new Date()
      const spinner = ora('Running post-build scripts...\n').start()
      spinner.stream = process.stdout

      if (parameters.skip.indexOf('post') === -1) {
        let command = null
        const folders = getConfig('folders')
        if (parameters.type === 'Development') {
          const scriptFolder = path.join(folders.templates, parameters.settings.template, 'templatescripts', 'development.js') 
          if ( fs.existsSync( scriptFolder ) ) {
            command = scriptFolder
          }
        } else {
          const scriptFolder = path.join(folders.templates, parameters.settings.template, 'templatescripts', 'production.js')
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
              console.log(`Child exited with code: ${exitCode}`)
              // reject({ message: 'Postbuild Finished with code: ' + exitCode, error: exitCode })
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
  lastStep_success: (parameters) => {
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
}
