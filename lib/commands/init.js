const micromatch = require('micromatch')
const readdir = require('recursive-readdir')
const signale = require('signale')
const prompts = require('prompts')
const ignore = require('../ignore')
const fs = require('fs-extra')
const path = require('path')

const { cwd, twd, isWaffleProject } = require('../utils')

require('commander')
  .command('init [dir]')
  .action(async (dir, cmd) => {
    const cwd = process.cwd()
    const root = `${__dirname}/../..`

    if (!dir) dir = cwd
    dir = path.relative(cwd, dir)
    dir = dir === '' ? '.' : dir

    signale.info(`Creating new static-waffle project in '${dir}'`)

    const appDir = dir === '.' ? cwd : dir
    const appFile = `${appDir}/package.json`

    if (isWaffleProject(appDir) || await fs.exists(appFile)) {
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

    const appname = path.basename(dir === '.' ? cwd : dir)
    const options = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Application name',
        initial: appname,
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
    const { version } = require('../../package.json')

    // TODO: do not overwrite package.json if already exists
    await fs.writeFile(appFile, JSON.stringify({
      name: 'static-waffle-project',
      version: '1.0.0',
      private: false,
      license: 'MIT',
      waffle: {
        name: options.name,
        structure: options.structure,
      },
      devDependencies: {
        'static-waffle': `^${version}`,
      },
      scripts: {
        export: 'waffle export',
        deploy: 'git subtree push --prefix dist origin gh-pages',
        push: 'export && git push && deploy',
      },
    }, null, 2))

    const srcDir = `${root}/template`
    const copyFiles = await readdir(srcDir)
    const filteredFiles = micromatch.not(copyFiles.map(f => {
      return path.relative(srcDir, f)
    }), [
      ...(options.structure === 'compact'
        ? ignore.compactIgnoredFiles
        : []
      ),
      ...ignore.ignoredFiles,
    ])

    await Promise.all(filteredFiles.map(f => {
      return fs.copy(`${srcDir}/${f}`, `${dir}/${f}`)
    }))

    signale.success('Successfully created new project')
  })
