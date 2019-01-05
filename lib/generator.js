const camelcase = require('camelcase')
const pkg = require('../package.json')
const program = require('commander')
const fs = require('fs')

program.version(pkg.version)

const commandFilesDir = `${__dirname}/commands`
for (const commandFile of fs.readdirSync(commandFilesDir)) {
  require(`./commands/${commandFile}`)
}

program.parse(process.argv)
