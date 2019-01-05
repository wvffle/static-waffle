const micromatch = require('micromatch')
const signale = require('signale')
const prompts = require('prompts')
const ignore = require('../ignore')
const fs = require('fs-extra')
const path = require('path')

require('commander')
  .command('init [dir]')
  .action(async (dir, cmd) => {
    const cwd = process.cwd()

    if (!dir) dir = cwd
    dir = path.relative(cwd, dir)
    dir = dir === '' ? '.' : dir

    signale.info(`Creating new static-waffle project in '${dir}'`)

    const appFile = `${dir === '.' ? cwd : dir}/waffle.json`

    if (await fs.exists(appFile)) {
      const { name } = require(appFile)
      signale.warn(`Project '${name}' already exists in '${dir}'`)

      const { next } = await prompts({
        type: 'confirm',
        name: 'next',
        message: `Initialize new project in '${dir}'?`,
        initial: false,
      })

      if (!next) return
    }

    const options = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Application name',
        initial: path.basename(dir === '.' ? cwd : dir),
      },
      {
        type: 'select',
        name: 'structure',
        message: 'File structure type',
        choices: [
          { title: 'Compact', value: 'compact' },
          { title: 'Full', value: 'full' },
        ],
        initial: 0,
      },
    ])

    await fs.writeFile(appFile, JSON.stringify(options, null, 2))
    signale.success(`+ waffle.json`)

    const srcDir = __dirname + '/../../template/'
    fs.copySync(srcDir, dir, {
      filter (src, dest) {
        const relativeSrc = path.relative(srcDir, src)

        if (options.structure === 'compact') {

          // Do not copy compact files
          if (micromatch.some(relativeSrc, ignore.compactIgnoredFiles)) {
            return false
          }
        }

        // Do not copy ignored files
        if (micromatch.some(relativeSrc, ignore.ignoredFiles)) {
          return false
        }

        if (src.split('/').slice(-1)[0].includes('.')) {
          signale.success(`${relativeSrc} -> ${dest}`)
        }

        return true
      }
    })

    signale.success('Successfully created new project')
  })
