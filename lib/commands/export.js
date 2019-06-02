const readdir = require('recursive-readdir')
const exporter = require('../exporter')
const signale = require('signale')
const fs = require('fs-extra')
const path = require('path')

const { cwd, isWaffleProject } = require('../utils')

require('commander')
  .command('export')
  .action(async (cmd) => {

    if (!isWaffleProject()) {
      signale.error('Not a static-waffle project')
      return
    }

    signale.info(`Exporting src/ to dist/`)

    const files = await readdir(cwd)
    try {
      const e = await exporter.export()
      signale.success('Successfully exported project')
    } catch (e) {
      signale.error('Error while exporting')
      signale.error(e)
    }

  })
