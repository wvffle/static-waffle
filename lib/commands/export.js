const readdir = require('recursive-readdir')
const exporter = require('../exporter')
const signale = require('signale')
const fs = require('fs-extra')
const path = require('path')

require('commander')
  .command('export [dir]')
  .action(async (dir, cmd) => {
    const cwd = process.cwd()
    const root = `${__dirname}/../..`
    const twd = `${root}/template`

    if (!await fs.exists(`${cwd}/waffle.json`)) {
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
    const options = require(`${cwd}/waffle.json`)

    const files = await readdir(cwd)
    try {
      await exporter.export(files, dir)
      signale.success('Successfully exported project')
    } catch (e) {
      signale.error('Error while exporting')
      signale.error(e)
    }

  })
