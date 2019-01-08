const readdir = require('recursive-readdir')
const exporter = require('../exporter')
const signale = require('signale')
const fs = require('fs-extra')
const path = require('path')

const { cwd, isWaffleProject } = require('../utils')

require('commander')
  .command('export [dir]')
  .action(async (dir, cmd) => {

    if (!isWaffleProject()) {
      signale.error('Not a static-waffle project')
      return
    }

    if (!dir) dir = 'dist'
    dir = path.relative(cwd, dir)

    if (dir === '') {
      signale.error('Cannot export to the project root')
      return
    }

    await fs.emptyDir(dir)
    signale.info(`Exporting src/ to ${dir}/`)

    const files = await readdir(cwd)
    try {
      await exporter.export(files, dir)
      signale.success('Successfully exported project')
    } catch (e) {
      signale.error('Error while exporting')
      signale.error(e)
    }

  })
