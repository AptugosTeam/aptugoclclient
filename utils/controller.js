const log = require('../utils/log.js')
const config = require('./config.js')
const path = require('path')
const fs = require('fs')
const os = require('os')
const pty = require('node-pty')
const { execSync } = require('child_process')
let ptyproc

const args = [
	'-ilc',
	'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit',
]

const detectDefaultShell = () => {
	const {env} = process;

	if (process.platform === 'win32') {
		return env.COMSPEC || 'cmd.exe';
	}

	try {
		const {shell} = userInfo();
		if (shell) {
			return shell;
		}
	} catch {}

	if (process.platform === 'darwin') {
		return env.SHELL || '/bin/zsh';
	}

	return env.SHELL || '/bin/sh';
}

const controllerModule = {
  path: () => {
    const result = execSync(`${detectDefaultShell()} -ilc env`, { encoding: 'utf8' })
    console.log(result)
  },
  run: async ({ app }) => {
    log(`Running ${app.settings.name}`, { type: 'mainTitle' })
    const settings = app.settings.development
    const buildFolder = settings.folder
    const fullbuildfolder = config.get('folders').build
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
    found = `"${found}"`

    var shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
    // const pty = require('node-pty')
    console.log('pty is', pty)
    ptyproc = await pty.spawn(shell, [], {
      name: 'aptugo-process-controller',
      cols: 80,
      rows: 30,
      cwd: finalFolder,
      env: process.env
    });

    ptyproc.onData((data) => {
      process.stdout.write(data)
    })

    ptyproc._isReady = true
    await controllerModule.killIfRunning()
    ptyproc.write(`${found} start\r`)
    fs.writeFileSync( path.join( os.tmpdir(), 'aptugo-state.json' ), ptyproc._pid + '')
    return 'ok'
  },
  stop: async () => {
    try {
      const pid = fs.readFileSync( path.join( os.tmpdir(), 'aptugo-state.json' ), { encoding: 'utf-8' })
      process.kill(pid,'SIGKILL')
      if (ptyproc) ptyproc.kill()
      fs.rmSync( path.join( os.tmpdir(), 'aptugo-state.json' ) )
      return 'ok'
    } catch(e) {
      if (e.code === 'ESRCH') { // No such process, so: delete the state
        fs.rmSync( path.join( os.tmpdir(), 'aptugo-state.json' ) )
      }
      console.error(e)
      return 'ok'
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
    if (await controllerModule.isRunning() !== 'no') {
      await controllerModule.stop()
    }
  }
}

module.exports = controllerModule
