// post-install.js
const path = require('path')
const os = require('os')
const fs = require('fs')

const paths = (process.env.PATH || '').split(path.delimiter)
paths.sort( function (a,b) { return a.length > b.length ? 1 : -1 })

let copied = false
paths.forEach(path => {
  if (copied === false) {
    console.log(path)
    try {
      const res = fs.copyFileSync('./index-macos', path + '/aptugo')
      copied = true
    } catch(e) {}
  }
})
console.log(copied)
