const { list: appsList } = require('../utils/apps')
const prompt = require('prompt')
const getPrompt = require('util').promisify(prompt.get).bind(prompt)
const cliSelect = require('cli-select')
const log = require('../utils/log')

module.exports = async (args) => {
  log('Listing Aptugo applications', { type: 'mainTitle' })
  
  const output = await appsList()
  return output
}
