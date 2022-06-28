import fs from 'fs'
import path from 'path'

export default (parameters) => {
  const assetsDefinition = JSON.parse( fs.readFileSync(path.join(parameters.appFolder, 'assets.json' ), { encoding: 'utf8'}, true) )

  aptugocli.createIfDoesntExists( path.join(parameters.fullbuildfolder, parameters.buildFolder, 'dist') )
  aptugocli.createIfDoesntExists( path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'img') )
  aptugocli.createIfDoesntExists( path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'css') )

  assetsDefinition.forEach(file => {
    const fileSourcePath = path.join(parameters.filesFolder, `${file.id}_${file.name}`)
    let fileDestinationPath = path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'img', file.name )
    if (file.type === 'stylesheet') fileDestinationPath = path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'css', file.name )

    fs.copyFileSync(fileSourcePath, fileDestinationPath)

    if (file.versions && file.versions.length) {
      file.versions.forEach(version => {
        const fileSourcePath = path.join(parameters.filesFolder, `${version.id}_${version.name}`)
        let fileDestinationPath = path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'img', version.name )
        if (file.type === 'stylesheet') fileDestinationPath = path.join(parameters.fullbuildfolder, parameters.buildFolder,  'dist', 'css', version.name )
        fs.copyFileSync(fileSourcePath, fileDestinationPath)
      })
    }
  })
}
