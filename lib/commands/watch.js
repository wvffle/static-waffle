const exporter = require('../exporter')
const signale = require('signale')
const fs = require('fs-extra')
const path = require('path')

const { cwd, isWaffleProject } = require('../utils')

require('commander')
  .command('watch')
  .action(async (cmd) => {

    if (!isWaffleProject()) {
      signale.error('Not a static-waffle project')
      return
    }

    signale.info(`Exporting src/ to dist/`)

    try {
      await exporter.watch()
      signale.success('Successfully watching project')
    } catch (e) {
      signale.error('Error while exporting')
      signale.error(e)
    }

  })
