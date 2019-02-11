const { dest, watch } = require('gulp')
const { Signale } = require('signale')

const livereload = require('gulp-livereload')
const readdir = require('recursive-readdir')
const webserver = require('gulp-webserver')
const utils = require('../utils')
const fs = require('fs-extra')
const path = require('path')
const del = require('del')
const ejs = require('ejs')

const { app, cwd, bwd, src, series, parallel } = utils
const srcPath = `${cwd}/src`

const clean = () => del('dist')

const prepare = async () => {
  const [ srcFiles, ignoredFiles ] = await Promise.all([
    readdir(`${cwd}/src`),
    utils.ignoredFiles(),
  ])

  const queue = {}

  for (const file of ignoredFiles) {
    const dest = `/tmp/${app.name}/${file.slice(4)}`
    queue[dest] = `${utils.twd}/${file}`
  }

  for (const file of srcFiles) {
    const dest = `/tmp/${app.name}/${path.relative(`${cwd}/src`, file)}`
    queue[dest] = file
  }

  return Promise.all(Object.entries(queue).map(entry => {
    return fs.copy(entry[1], entry[0])
  }))
}

const views = async () => {
  const valueFiles = await getValueFiles()
  const views = await fs.readdir(`${srcPath}/views`)

  const viewTasks = views.map(view => {
    const viewExporter = require('./view')
    return viewExporter(view, valueFiles)
  })

  return parallel(...viewTasks)()
}

const componentFetcher = (components) => {
  return async () => {
    const fetcherContent = await fs.readFile(`${__dirname}/componentFetcher.ejs`)
    const content = ejs.render(`${fetcherContent}`, {
      components:  JSON.stringify(components),
    })

    await fs.outputFile(`${process.cwd()}/dist/components/fetcher.js`, content)
  }
}

const components = async () => {
  const components = await fs.readdir(`${bwd}/components`)
  const valueFiles = await getValueFiles()

  const tasks = (components.map(component => {
    const componentExporter = require('./component')
    return componentExporter(component, valueFiles)
  }))

  const fetcher = componentFetcher(components)

  return parallel(...tasks, fetcher)()
}

const values = async () => {
  return parallel(views, components)()
}

const cache = {
  valueFiles: null
}

const getValueFiles = async () => {
  if (cache.valueFiles !== null) return cache.valueFiles

  const values = {
    pug: [],
    styl: [],
  }

  const valuesDir = `${bwd}/values`
  const userValues = await fs.readdir(valuesDir)
  const valueFiles = userValues.map(f => path.normalize(`${valuesDir}/${f}`))

  for (const file of valueFiles) {
    const ext = path.extname(file).slice(1)
    ;(values[ext] = (values[ext] || [])).push(file)
  }

  return cache.valueFiles = values
}

const watcher = async () => {
  // livereload.listen(37666)

  require('../watcher/component')
  require('../watcher/value')
  require('../watcher/view')

  return src([cwd, __dirname])
    .pipe(webserver({
      livereload: true,
      directoryListing: true,
      open: true,
    }))
}

module.exports = {
   _cache: cache,
  export: series(parallel(clean, prepare), values),
  watch: watcher,
  clean, prepare, views, components, values,
  getValueFiles,
  componentFetcher,
}
