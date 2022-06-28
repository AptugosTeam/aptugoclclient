import fs from 'fs'
import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import config from './config.js'
import { getTree } from './files.js'
import axios from 'axios'
import { exit } from 'process'
import { isBinary } from 'istextorbinary'
const AdmZip = import("adm-zip")

function downloadBase (source, destination) {
  return new Promise((resolve, reject) => {
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
          console.log('\r- Removing destination', destination)
          fs.rmSync(destination, { recursive: true, force: true })
        } catch(e) {
          console.log('\rERROR: Unable to remove destination', e)
        }

        // Rename ziptemp to zip
        try {
          console.log('\r- Renaming destination', destination + 'temp', destination)
          fs.renameSync(destination + 'temp', destination)
          fs.chmodSync(destination,'755')
        } catch(e) {
          console.log('\rERROR: Could not rename ', destination + 'temp', destination, e)
        }

        const destinationPath = path.join( os.tmpdir(), 'AptugoBase' )
        // Remove and Prepare temp folder
        try {
          console.log('\r- Removing temp path', destinationPath)
          fs.rmSync(destinationPath, { recursive: true })
        } catch(e) {}
        try {
          console.log('\r- Creating temp path', destinationPath)
          fs.mkdirSync(destinationPath)
        } catch (err) {
          console.log('\rCould not create temp path!', err)
        }

        // Extract to a temp folder
        try {
          console.log('\r- Extracting zip', destinationPath)
          var zip = new AdmZip(destination)
          await zip.extractAllTo(destinationPath)
          console.log('\r✅ - Extraction complete\r')
        } catch (err) {
          console.log('\rExtraction ERROR!', err)
        }


        // Detecting folder name
        const weirdName = fs.readdirSync(destinationPath)
        try {
          console.log('\r- Extracting zip Step B', destinationPath)
          console.log( path.join(destinationPath, weirdName[0], 'templates') )
          console.log( path.join(destinationPath, weirdName[0], 'structures') )
        } catch (err) {
          console.log('\rStep B Extraction Error!', err)
        }

        // Check if templates folder exists and renames it if it does
        try {
          console.log(`\r- Checking readiness of Final Destination: ${config.get('folders').templates}`)
          if (fs.existsSync(config.get('folders').templates) && fs.readdirSync(config.get('folders').templates).length > 0) { // Final Directory is not empty
            console.log('\r- Final Destination is not Empty, creating backup\r')
            fs.renameSync(get('folders').templates, `${get('folders').templates}_${new Date().getTime()}`)
          }
        } catch(e) {
          console.log('\r- Final Destination error\r', e)
        }

        // Move templates to the destination folder
        try {
          console.log(`\r- Now moving from ${path.join(destinationPath, weirdName[0], 'templates')}`)
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
              console.log(`\r- Changing execution perms on ${templateScriptsDir}`)
              fs.chmodSync(templateScriptsDir, '755')
              const executableFiles = fs.readdirSync(templateScriptsDir)
              executableFiles.forEach(execFile => {
                const execFilePath = path.join(templateScriptsDir, execFile)
                console.log(`\r- Changing execution perms on ${execFilePath}`)
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

const templates = {
  list: (loadfull = false) => {
    const toReturn = []
    const folders = config.get('folders')
    const templateFolders = fs.readdirSync(folders.templates)
    templateFolders.forEach(templateFolder => {
      try {
        if (fs.lstatSync( path.join(folders.templates,templateFolder) ).isDirectory()) {
          if (fs.existsSync(path.join(folders.templates,templateFolder,'template.json'))) {
            const fileContents = fs.readFileSync(path.join(folders.templates,templateFolder,'template.json'), { encoding: 'utf8'}, true)
            if (fileContents) {
              let templateDefinition = JSON.parse( fileContents )
              if ( loadfull ) {
                templateDefinition = templates.get(templateDefinition._id, templateFolder)
              }
              toReturn.push(templateDefinition)
            }
          }
        }
      } catch(e) {
        console.error(e)
      }
    })
    return toReturn
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
    const parsedFile = templates.fsParseFileForStorage(fileDetails)
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
    const templates = templates.list()
    const currentTemplate = templates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, currentTemplate._id ), '', true )
    const file = templates.findFileWithUniqueID(currentTemplate.files, fileID)
    if (!file) return 'Error: File not found'
    const fileSource = fs.readFileSync(path.join(folders.templates, currentTemplate._id, file.completePath,templates.renderPath(file)), 'utf8')
    return fileSource
  },
  get: (templateID, templateFolder) => {
    const folders = config.get('folders')
    const thetemplates = templates.list()
    const currentTemplate = thetemplates.filter(template => template._id === templateID)[0]
    currentTemplate.files = getTree( path.join( folders.templates, templateFolder || currentTemplate._id ), '', true )
    currentTemplate.fields = templates.getFields(templateFolder || currentTemplate._id)
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
          const [discard, fieldSource] = templates.fsParseFile( fs.readFileSync(path.join( fieldsFolder, fieldFileName ), 'utf8') )

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
    const fileSource = templates.fsLoadFileSource(params)
    return templates.fsParseFile(fileSource)
  },
  fsLoadFileSource: (params) => {
    let template, file
    if (!params.file) {
      template = aptugocli.activeParameters.template
      file = params.unique_id
      ? templates.findFileWithUniqueID(template.files, params.unique_id , path.join( config.get('folders').templates ,template._id))
      : templates.findFileWithPath(template.files, params.path, path.join( config.get('folders').templates ,template._id))
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
        var found = templates.findFileWithUniqueID(tree[i].children, unique_id, path.join(acumulated_path, filePath))
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
        var found = templates.findFileWithPath(tree[i].children, thepath, path.join(acumulated_path, filePath))
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
        var found = templates.searchForRenderingPlaceholder(tree[i].children, acumulated + '/' + tree[i].path + '/')
        if (found) return found
      }
    }
  },
  download: (args) => {
    const remote = args.remote || 'https://api.github.com/repos/AptugosTeam/Base/releases/latest'
    return axios.get(remote).then(res => {
      var downloadedVersion = 1
      releaseName = res.data.tag_name
      const sourceFile = res.data.zipball_url
      let destination = path.join( os.tmpdir(), 'aptugoBase.zip' )
      if (downloadedVersion !== releaseName) {
        downloadBase(sourceFile, destination).then(response => {
          return response
        })
      } else {
        return `Base templates up to date! (${downloadedVersion})`
      }
    })
  }
}

export default templates
