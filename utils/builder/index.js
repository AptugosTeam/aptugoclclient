const path = require('path')
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
const {spawn} = require('child_process');

const twigExtensions = () => {
  extendFunction('parse', te.parse)
  extendFunction('includeTemplate', te.includeTemplate)
  extendFunction('insert_setting', te.insertSetting)
  extendFunction('save_delayed', te.saveDelayed)

  extendFilter('elementData', te.elementData)
  extendFilter('fieldData', te.fieldData)
  extendFilter('removeExtension', te.removeExtension)
  extendFilter('plain', te.plain)
  extendFilter('tableData', te.tableData)

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

  

  

  // extendFilter('assetData', function(value) {
  //   return builderObj.plainAssets[value]
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
              module.exports.lastStep_success(parameters)
            })
          })
        })
      })
    })
  },

  buildParameters: (buildData) => {
    const application = loadApp(buildData.app)
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

      const elementsFolder = parameters.template.files.filter(file => file.path === 'elements')[0]
      aptugo.loadedElements = loadElements(elementsFolder.children)
      saveTwigTemplates(elementsFolder.children)
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
        aptugo.generationFolder = searchForRenderingPlaceholder(parameters.template.files, parameters.buildFolder)
        parameters.application.pages.forEach(page => buildPage(page, parameters))
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
