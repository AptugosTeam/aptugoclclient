const log = require('../utils/log')
const { fork, exec } = require('child_process');
const { state: loadState } = require('../utils/state')
const { get: getConfig } = require('./config')
const path = require('path')
const fs = require('fs')
const os = require('os')

let ptyproc
module.exports = {
  run: async ({ app }) => {
    const state = await loadState()

    log(`Running ${app.settings.name}`, { type: 'mainTitle' })
    const settings = app.settings.development
    const buildFolder = settings.folder
    const fullbuildfolder = getConfig('folders').build
    const finalFolder = path.join(fullbuildfolder, buildFolder)

    // Find PNPM
    const paths = (process.env.PATH || '').split(path.delimiter)
    paths.sort( function (a,b) { return a.length > b.length ? 1 : -1 })

    let found = false
    paths.forEach(thepath => {
      if (found === false) {
        try {
          if (fs.existsSync(path.join(thepath, 'pnpm'))) {
            found = path.join(thepath, 'pnpm')
          }
          
        } catch(e) {}
      }
    })

    if (!found) return { exitCode: 1, error: 'Could not find PNPM (maybe you need to run npm i -g pnpm ?)'}
    console.log('about to start', found)
    found = `"${found}"`

    var pty = require('node-pty');
    var shell = os.platform() === 'win32' ? 'command.exe' : 'bash';

    ptyproc = pty.spawn(shell, [], {
      name: 'aptugo-process-controller',
      cols: 80,
      rows: 30,
      cwd: finalFolder,
      env: process.env
    });

    ptyproc.onData((data) => {
      process.stdout.write(data)
    })

    await module.exports.killIfRunning()
    ptyproc.write(`${found} start\r`)
    fs.writeFileSync( path.join( os.tmpdir(), 'aptugo-state.json' ), ptyproc._pid + '')
  },
  stop: async () => {
    console.log('pty', ptyproc)
    try {
      const pid = fs.readFileSync( path.join( os.tmpdir(), 'aptugo-state.json' ), { encoding: 'utf-8' })
      process.kill(pid,'SIGKILL')
      if (ptyproc) ptyproc.kill()
      fs.rmSync( path.join( os.tmpdir(), 'aptugo-state.json' ) )
      ptyproc.
    } catch(e) {
      if (e.code === 'ESRCH') { // No such process, so: delete the state
        fs.rmSync( path.join( os.tmpdir(), 'aptugo-state.json' ) )
      }
      console.error(e)
    }
  },
  isRunning: async () => {
    try {
      const pid = fs.readFileSync( path.join( os.tmpdir(), 'aptugo-state.json' ) , { encoding: 'utf-8' })
      return pid
    } catch(e) {}
    
    return 'no'
  },
  killIfRunning: async () => {
    console.error('is running', await module.exports.isRunning())
    if (await module.exports.isRunning() !== 'no') {
      await module.exports.stop()
    }
  }
}
