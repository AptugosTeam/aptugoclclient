const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const config = require('./config.js')
const { getTree } = require('./files.js')
const axios = require('axios')
const { exit } = require('process')
const { isBinary } = require('istextorbinary')
const AdmZip = require('adm-zip')
const log = require('./log.js')

function downloadBase (source, destination) {
  return new Promise((resolve, reject) => {
    log(`Starting templates download`, { type: 'advance', level: 0, verbosity: 1 })
    return axios({
      url: source,
      method: 'GET',
      responseType: 'stream'
    }).then(res => {
      const { data, headers } = res
      let sum = 0
      const totalLength = '2000000'

      const writer = fs.createWriteStream( destination + 'temp' )

      data.on('data', (chunk) => {
        sum = sum + parseInt(chunk.length)
        const perc = sum * 100 / parseInt(totalLength)
      })

      data.on('close', async () => {
        // Remove old downloads
        try {
          log(`Removing old destination at ${destination}`, { type: 'advance', level: 1, verbosity: 5 })
          fs.rmSync(destination, { recursive: true, force: true })
        } catch(e) {
          log(`Error: Unable to remove old destination at ${destination}`, { type: 'advance', level: 1, verbosity: 2 })
          console.error(e)
        }

        // Rename ziptemp to zip
        try {
          log(`Renaming destination from ${destination}temp to ${destination}`, { type: 'advance', level: 1, verbosity: 5 })
          fs.renameSync(destination + 'temp', destination)
          fs.chmodSync(destination,'755')
        } catch(e) {
          log(`Error: Could not rename ${destination}temp to ${destination} `, { type: 'advance', level: 1, verbosity: 2 })
          console.error(e)
        }

        const destinationPath = path.join( os.tmpdir(), 'AptugoBase' )
        // Remove and Prepare temp folder
        try {
          log(`Recursively removing temp path at ${destinationPath}`, { type: 'advance', level: 1, verbosity: 5 })
          fs.rmSync(destinationPath, { recursive: true })
        } catch(e) {}

        try {
          log(`And creating it from scratch at ${destinationPath}`, { type: 'advance', level: 1, verbosity: 5 })
          fs.mkdirSync(destinationPath)
        } catch (err) {
          console.log('\rCould not create temp path!', err)
        }

        // Extract to a temp folder
        try {
          log(`Extracting Zip with templates at ${destinationPath}`, { type: 'advance', level: 1, verbosity: 5 })
          var zip = new AdmZip(destination)
          await zip.extractAllTo(destinationPath)
          log(`✅ Extraction Complete`, { type: 'advance', level: 1, verbosity: 3 })
        } catch (err) {
          log(`❌ Extraction Failed`, { type: 'advance', level: 1, verbosity: 3 })
          console.error(err)
          reject(err)
        }

        // Detecting folder name
        const weirdName = fs.readdirSync(destinationPath)

        // Check if templates folder exists and renames it if it does
        try {
          log(`Checking readiness of Final Destination: ${config.get('folders').templates}`, { type: 'advance', level: 2, verbosity: 4 })
          if (fs.existsSync(config.get('folders').templates) && fs.readdirSync(config.get('folders').templates).length > 0) { // Final Directory is not empty
            log(`Final Destination is not Empty, creating backup`, { type: 'advance', level: 3, verbosity: 4 })
            fs.renameSync(config.get('folders').templates, `${config.get('folders').templates}_${new Date().getTime()}`)
          }
        } catch(e) {
          console.log('\r- Final Destination error\r', e)
        }

        // Move templates to the destination folder
        try {
          log(`Now moving templates`, { type: 'advance', level: 2, verbosity: 4 })
          fs.renameSync(path.join(destinationPath, weirdName[0], 'templates'), config.get('folders').templates )
        } catch(e) {
          console.log('\rERROR: could not move templates')
          console.log('\rError was', e)
        }

        // Chmod template scripts
        try {
          const templatesDir = config.get('folders').templates
          const allTemplates = fs.readdirSync(templatesDir)
          allTemplates.forEach(template => {
            const templateScriptsDir = path.join(templatesDir, template, 'templatescripts')
            if (fs.existsSync( templateScriptsDir )) {
              log(`And adjusting execution perms`, { type: 'advance', level: 3, verbosity: 6 })
              fs.chmodSync(templateScriptsDir, '755')
              const executableFiles = fs.readdirSync(templateScriptsDir)
              executableFiles.forEach(execFile => {
                const execFilePath = path.join(templateScriptsDir, execFile)
                log(`Changing execution perms on ${execFilePath}`, { type: 'advance', level: 4, verbosity: 6 })
                fs.chmodSync(execFilePath, '755')
              })
            }
          })
        } catch(e) {
          console.error(e)
        }

        // Check if structures folder exists and renames it if it does
        try {
          console.log(`\r- Checking readiness of Final Destination: ${config.get('folders').structures}`)
          if (fs.existsSync(config.get('folders').structures) && fs.readdirSync(config.get('folders').structures).length > 0) { // Final Directory is not empty
            console.log('\r- Final Destination is not Empty, creating backup\r')
            fs.renameSync(config.get('folders').structures, `${config.get('folders').structures}_${new Date().getTime()}`)
          }
        } catch(e) {
          console.log('\r- Final Destination error\r', e)
        }

        // Move structures to the destination folder
        try {
          console.log(`\r- Now moving from ${path.join(destinationPath, weirdName[0], 'structures')}`)
          fs.renameSync( path.join(destinationPath, weirdName[0], 'structures'), config.get('folders').structures )
        } catch(e) {
          console.log('\rERROR: could not move structures')
          console.log('\rError was', e)
        }

        resolve('ok')
      })

      data.pipe(writer)
    })
  })
}

const templatesModule = {
  list: (loadfull = false) => {
    try {
      const toReturn = []
      const folders = config.get('folders')
      if (!folders.templates) {
        throw({
          exitCode: 150,
          message: 'Aptugo Client is not configured'
        })
      }
      let templateFolders = []
      try {
        templateFolders = fs.readdirSync(folders.templates)
      } catch(e) {
        throw({
          exitCode: 151,
          message: 'Templates folder missing'
        })
      }

      templateFolders.forEach(templateFolder => {
        try {
          if (fs.lstatSync( path.join(folders.templates,templateFolder) ).isDirectory()) {
            if (fs.existsSync(path.join(folders.templates,templateFolder,'template.json'))) {
              const fileContents = fs.readFileSync(path.join(folders.templates,templateFolder,'template.json'), { encoding: 'utf8'}, true)
              if (fileContents) {
                let templateDefinition = JSON.parse( fileContents )
                if ( loadfull ) {
                  templateDefinition = templatesModule.get(templateDefinition._id, templateFolder)
                }
                toReturn.push(templateDefinition)
              }
            }
          }
        } catch(e) {
          throw({
            exitCode: 171,
            error: e,
            message: 'Failed to read template folder ' + templateFolder
          })
        }
      })
      return toReturn
    } catch(e) {
      if (e.exitCode) throw(e)
      else {
        throw({
          exitCode: 170,
          error: e,
          message: 'Could not read templates folder (is it configured?)'
        })
      }
    }

  },
  version: (args) => {
    const folders = config.get('folders')
    if ( folders.templates && fs.existsSync( path.join(folders.templates, 'version.txt') ) ) {
      const version = fs.readFileSync( path.join(folders.templates, 'version.txt'), { encoding: 'utf8' } )
      return version
    } else {
      return 'unknown'
    }
  },
  create: (args) => {
    args = JSON.parse(args)
    const folders = config.get('folders')
    const templateDefinitionFolder = path.join(folders.templates, args._id)
    if (!fs.existsSync(templateDefinitionFolder)) {
      fs.mkdirSync(templateDefinitionFolder)
    }
    fs.writeFileSync(path.join(templateDefinitionFolder,'template.json'), JSON.stringify( args, null, 2 ), { flag:'w' })
    return args
  },
  remove: (args) => {
    const template = args.template
    const folders = config.get('folders')
    const tplFolders = folders.templates
    const saveFolder = path.join(tplFolders, template)
    fs.rmdirSync(saveFolder, { recursive: true })
    return 'ok'
  },
  setoption: (templateFolder, option, value) => {
    const folders = config.get('folders')
    const templateFilePath = path.join(folders.templates,templateFolder,'template.json')
    const templateContents = fs.readFileSync(templateFilePath)
    if (templateContents) {
      let templateDefinition = JSON.parse( templateContents )
      templateDefinition[option] = value
      fs.writeFileSync(templateFilePath, JSON.stringify(templateDefinition, null, 2), {flag:'w'})
    }
  },
  setfield: (templateFolder, fieldDefinition) => {
    const folders = config.get('folders')
    const templateFolderPath = path.join(folders.templates,templateFolder)
    const fieldsDefinitionFolder = path.join(templateFolderPath,'Fields')
    if (!fs.existsSync(fieldsDefinitionFolder)) {
      fs.mkdirSync(fieldsDefinitionFolder)
    }
    fs.writeFileSync(path.join(fieldsDefinitionFolder,`${fieldDefinition.name}.json`), JSON.stringify( JSON.parse(fieldDefinition.value), null, 2 ), { flag:'w' })
    return path.join(fieldsDefinitionFolder,`${fieldDefinition.name}.json`)
  },
  setfile: (templateFolder, fileDefinition) => {
    const fileDetails = JSON.parse(fileDefinition)
    const parsedFile = templatesModule.fsParseFileForStorage(fileDetails)
    const folders = config.get('folders')
    const templateFolderPath = path.join(folders.templates,templateFolder)

    const fileName = fileDetails.modelRelated ? fileDetails.completePath.replace(/{{(.*?)}}/g, `${fileDetails.subtype}[X]`) : fileDetails.completePath || fileDetails.path
    if (fileDetails.type === 'folder') {
      const folderPath = path.join(templateFolderPath, fileName)
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath)
      }
      const { children, source, ...cleanFileDetails } = fileDetails
      fs.writeFileSync(path.join(folderPath,'_.yaml'), yaml.dump(cleanFileDetails))
    } else if (parsedFile) {
      fileDetails.source = parsedFile
      const filePath = path.join(templateFolderPath, fileName)
      fs.writeFileSync(filePath, fileDetails.source)
    }
  },
  renderPath: (file) => {
    if (file.modelRelated) {
      return file.path.replace(/{{(.*?)}}/g, `${file.subtype}[X]`)
    } else {
      return file.path
    }
  },
  fileSource: (templateID, fileID) => {
    const folders = config.get('folders')
    const templates = templatesModule.list()
    const currentTemplate = templates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, currentTemplate._id ), '', true )
    const file = templatesModule.findFileWithUniqueID(currentTemplate.files, fileID)
    if (!file) return 'Error: File not found'
    const fileSource = fs.readFileSync(path.join(folders.templates, currentTemplate._id, file.completePath,templatesModule.renderPath(file)), 'utf8')
    return fileSource
  },
  get: (templateID, templateFolder) => {
    const folders = config.get('folders')
    const thetemplates = templatesModule.list()
    const currentTemplate = thetemplates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, templateFolder || currentTemplate._id ), '', true )
    currentTemplate.fields = templatesModule.getFields(templateFolder || currentTemplate._id)
    return currentTemplate
  },
  getFields: (templateFolder) => {
    const output = []
    const folders = config.get('folders')
    const fieldsFolder = path.join( folders.templates, templateFolder, 'Fields' )
    if (fs.existsSync(fieldsFolder)) {
      const fieldsInFolder = fs.readdirSync( fieldsFolder )
      fieldsInFolder.forEach(fieldFileName => {
        if (fieldFileName.toLowerCase().substr(-4) === 'json') {
          const [discard, fieldSource] = templatesModule.fsParseFile( fs.readFileSync(path.join( fieldsFolder, fieldFileName ), 'utf8') )

          let parsed
          try {
            parsed = JSON.parse(fieldSource)
            output.push(parsed)
          } catch(e) {
            console.log('error loading ', fieldFileName, e, fieldSource)
          }
        }
      })
    }
    return output
  },
  fsParseFileForStorage(fileDetails) {
    const {
      source,
      open,
      selected,
      selectedFile,
      ...cleanFileDetails
    } = fileDetails

    let output = '/*\n'
    output += yaml.dump(cleanFileDetails)
    output += '*/\n'
    output += fileDetails.source
    return output
  },
  fsParseFile: (fileSource) => {
    const regex = /^\/\*[\r]*\n(.*)[\r]*\n\*\/(.*)/is
    let m
    if ((m = regex.exec(fileSource)) !== null) {
      var yamlStuff = ''
      try {
        yamlStuff = yaml.load(m[1])
      } catch(e) {
        console.error(fileSource, e)
      }
      return [ yamlStuff , m[2]]
    }
    return [{}, fileSource]
  },
  fsLoadAndParseFile: (params) => {
    const fileSource = templatesModule.fsLoadFileSource(params)
    return templatesModule.fsParseFile(fileSource)
  },
  fsLoadFileSource: (params) => {
    let template, file
    if (!params.file) {
      template = aptugocli.activeParameters.template
      file = params.unique_id
      ? templatesModule.findFileWithUniqueID(template.files, params.unique_id , path.join( config.get('folders').templates ,template._id))
      : templatesModule.findFileWithPath(template.files, params.path, path.join( config.get('folders').templates ,template._id))
    } else {
      file = params.file
    }
    if (!file) return ''

    const fileName = file.modelRelated ? file.path.replace(/{{(.*?)}}/g, `${file.subtype}[X]`) : file.path
    try {
      const fileSource = fs.readFileSync(path.join(file.completePath,fileName), 'utf8')
      file.source = fileSource
      return fileSource
    } catch(e) {
      return ''
    }
  },
  findFileWithUniqueID: (tree, unique_id, acumulated_path = '') => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        const filePath = tree[i].modelRelated ? tree[i].path.replace(/{{(.*?)}}/g, `${tree[i].subtype}[X]`) : tree[i].path
        if (tree[i].unique_id === unique_id) {
          return {
            ...tree[i],
            completePath: acumulated_path
          }
        }
        var found = templatesModule.findFileWithUniqueID(tree[i].children, unique_id, path.join(acumulated_path, filePath))
        if (found) return found
      }
    }
  },
  findFileWithPath: (tree, thepath, acumulated_path) => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        const filePath = tree[i].modelRelated ? tree[i].path.replace(/{{(.*?)}}/g, `${tree[i].subtype}[X]`) : tree[i].path
        if (tree[i].completePath === thepath) {
          return {
            ...tree[i],
            completePath: acumulated_path
          }
        }
        var found = templatesModule.findFileWithPath(tree[i].children, thepath, path.join(acumulated_path, filePath))
        if (found) return found
      }
    }
  },
  searchForRenderingPlaceholder: (tree, acumulated = '.') => {
    if (tree) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i].placeholder === true) {
          return acumulated + tree[i].path
        }
        var found = templatesModule.searchForRenderingPlaceholder(tree[i].children, acumulated + '/' + tree[i].path + '/')
        if (found) return found
      }
    }
  },
  // Returns available Templates version
  checkTemplatesVersion: (args) => {
    const remote = args.remote || 'https://api.github.com/repos/AptugosTeam/BaseDev/releases/latest'
    return axios.get(remote).then(res => {
      return res.data.tag_name
    }).catch(e => {
      return e
    })
  },
  download: (args) => {
    const remote = args.remote || 'https://api.github.com/repos/AptugosTeam/BaseDev/releases/latest'
    return axios.get(remote).then(res => {
      var downloadedVersion = 1
      const releaseName = res.data.tag_name
      const sourceFile = res.data.zipball_url
      let destination = path.join( os.tmpdir(), 'aptugoBase.zip' )
      if (downloadedVersion !== releaseName) {
        downloadBase(sourceFile, destination).then(response => {
          const Messages = ['All your base are belong to us','That what I said','Everything should be ready now','And everrything for free!','Ready to rumble!','Things look good!']
          const selectedMessage = Messages[Math.floor(Math.random() * Math.floor(Messages.length))]
          aptugo.setFeedback({ kind: 'alert', title: 'Downloaded Templates!', message: selectedMessage })
          return response
        })
      } else {
        return `Base templates up to date! (${downloadedVersion})`
      }
    })
  }
}

module.exports = templatesModule
