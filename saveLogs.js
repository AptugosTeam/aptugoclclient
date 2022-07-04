const os = require('os')
const fs = require('fs')

const CustomLogger = {
  LOGS_DIR: os.tmpdir(),
  logDailyName(prefix) {
    const date = new Date().toLocaleDateString().replace(/\//g, '_')
    return `${this.LOGS_DIR}/${prefix}_${date}.log`
  },
  writeToLogFile(prefix, originalMsg) {
    const timestamp   = Date.now();
    const fileName    = this.logDailyName(prefix)
    const logMsg      = originalMsg
    fs.appendFileSync(fileName, `${timestamp}\t${logMsg}\n`)
    return originalMsg
  }
}

module.exports = function() {
  if (typeof aptugo !== 'undefined') {
    console.info = (args) => {
      aptugo.setFeedback({ kind: 'info', message: args })
    }

    console.warn = (...args) => {
      aptugo.setFeedback({ kind: 'error', error: args })
    }
  }

  if (!process.stdout.highjacked) {
    const stdoutWrite0 = process.stdout.write;
    process.stdout.highjacked = true
    process.stdout.write = (args) => {
      CustomLogger.writeToLogFile('aptugo_log', args)
      args = Array.isArray(args) ? args : [args]
      return stdoutWrite0.apply(process.stdout, args)
    }

    const stderrWrite0 = process.stderr.write;
    process.stderr.write = (args) => {
      CustomLogger.writeToLogFile('aptugo_error', args)
      args = Array.isArray(args) ? args : [args]
      return stderrWrite0.apply(process.stderr, args)
    }

    process.on('uncaughtException', (err) => {
      CustomLogger.writeToLogFile('aptugo_error', ((err && err.stack) ? err.stack : err));
    })
  }
}

