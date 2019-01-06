const componentExporter = require('./component')
const viewExporter = require('./view')
const ignore = require('../ignore')
const utils = require('../utils')
const mm = require('micromatch')
const fs = require('fs-extra')
const path = require('path')

module.exports = {
  async export (files, dir) {
    const { cwd } = utils
    const baselessFiles = files.map(f => path.relative(cwd, f))
    const tmpFiles = await this.prepare(baselessFiles)
    const values = await this.getValueFiles()

    // Export views
    const views = mm(tmpFiles, '**/.tmp/views/*/view.pug')
      .map(f => f.split('/').slice(-2)[0])

    await Promise.all(views.map(v => this.prepareView(v, tmpFiles)))
    await Promise.all(views.map(v => {
      const viewFiles = mm(tmpFiles, `**/.tmp/views/${v}/**`)
      return viewExporter(v, viewFiles, values, dir)
    }))

    // Export components
    const components = mm(tmpFiles, '**/.tmp/components/*/component.js')
      .map(f => f.split('/').slice(-2)[0])

    const styledComponents = {}
    await Promise.all(components.map(c => {
      return componentExporter(c, styledComponents, values, dir)
    }))

    await componentExporter.all(styledComponents, dir)

    // Clean up
    await fs.remove(`${utils.cwd}/.tmp`)
  },

  async prepareView (view, files) {
    const ignoredFiles = mm(await utils.ignoredFiles(), 'src/views/index/**')
    const viewFiles = mm(files, `**/.tmp/views/${view}/**`)

    const { twd } = utils

    const queue = {}
    for (const file of ignoredFiles) {
      const name = file.replace(/^src/, '.tmp').replace('index', view)
      if (viewFiles.includes(name)) continue

      queue[name] = `${twd}/${file}`
    }

    const promises = Object.entries(queue).map(entry => {
      return fs.copy(entry[1], `${cwd}/${entry[0]}`)
    })

    await Promise.all(promises)
  },

  async prepare (files) {
    const [ ignoredFiles ] = await Promise.all([
      utils.ignoredFiles(),
      fs.mkdirs(`${utils.cwd}/.tmp`),
    ])

    const queue = {}
    const { cwd, twd } = utils

    for (const file of ignoredFiles) {
      queue[file.replace(/^src/, '.tmp')] = `${twd}/${file}`
    }

    for (const file of files) {
      if (!file.startsWith('src')) continue
      queue[file.replace(/^src/, '.tmp')] = `${cwd}/${file}`
    }

    const promises = Object.entries(queue).map(entry => {
      return fs.copy(entry[1], `${cwd}/${entry[0]}`)
    })

    await Promise.all(promises)
    return Object.keys(queue)
  },

  async getValueFiles () {
    const { cwd } = utils
    const values = {
      pug: [],
      styl: [],
    }

    const valuesDir = `.tmp/values`
    const userValues = await fs.readdir(`${cwd}/${valuesDir}`)
    const valueFiles = userValues.map(f => path.normalize(`${cwd}/${valuesDir}/${f}`))

    for (const file of valueFiles) {
      const ext = path.extname(file).slice(1, Infinity)
      ;(values[ext] = (values[ext] || [])).push(file)
    }

    return values
  },
}
