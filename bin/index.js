#!/usr/bin/env node --experimental-json-modules --no-warnings
const init = require('../')

init().then(res => {
  if (res.exitCode !== null) {
    if (res.exitCode === 0) {
      console.log(res.data)
    } else {
      console.log(res)
    }
  } else {
    console.log(res)
  }
}).catch(e => {
  console.log('final catch', e)
  throw(e)
})
