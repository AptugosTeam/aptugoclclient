const chalk = require("chalk")
const ora = require('ora')
const { build } = require('../utils/builder/')
const { list: appsList } = require('../utils/apps')
const cliSelect = require('cli-select')
const log = require('../utils/log')

module.exports = async (args) => {
  log('Render template', { type: 'mainTitle' })
  console.log(args.source)
}
