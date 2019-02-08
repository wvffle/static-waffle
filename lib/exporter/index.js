const { dest, watch } = require('gulp')
const { Signale } = require('signale')

const livereload = require('gulp-livereload')
const readdir = require('recursive-readdir')
const utils = require('../utils')
const fs = require('fs-extra')
const path = require('path')
const del = require('del')
const ejs = require('ejs')

// TODO: Fix watcher exporting 2 times in a row

const cwd = process.cwd()
const srcPath = `${cwd}/src`

const { app, bwd, src, series, parallel } = utils

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

let _valueFiles = null
const getValueFiles = async () => {
  if (_valueFiles !== null) return _valueFiles

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

  return _valueFiles = values
}

const watcher = async () => {
  livereload.listen(37666)

  const valueFiles = await getValueFiles()

  const componentHandler = async (path, stats) => {
    const logger = new Signale()
    const component = path.slice(`${srcPath}/components/`.length).split('/')[0]
    const componentExporter = require('./component')
    logger.await(`Exporting '${component}' component`)

    await copy(path)
    const components = await fs.readdir(`${bwd}/components`)

    await Promise.all([
      componentExporter(component, valueFiles),
      componentFetcher(components)(),
    ])

    logger.success(`Exported '${component}' component`)
  }

  const viewRootHandler = async (path) => {
    const logger = new Signale()
    const view = path.slice(`${srcPath}/views/`.length).split('/')[0]
    const viewExporter = require('./view')
    logger.await(`Exporting '${view}' view`)

    await copy(path)
    await viewExporter.root(view, await getValueFiles())
    logger.success(`Exported '${view}' view`)
  }

  const viewTemplatesHandler = async (path) => {
    const logger = new Signale()
    const view = path.slice(`${srcPath}/views/`.length).split('/')[0]
    const viewExporter = require('./view')
    logger.await(`Exporting '${view}' view`)

    await copy(path)
    await viewExporter.templates(view, await getValueFiles())
    logger.success(`Exported '${view}' view`)
  }

  const viewAssetHandler = async (path) => {
    const logger = new Signale()
    const valueFiles = await getValueFiles()
    const view = path.slice(`${srcPath}/views/`.length).split('/')[0]
    const assetPath = path.slice(`${srcPath}/`.length)
    const viewExporter = require('./view')
    logger.await(`Exporting '${view}' view`)

    await copy(path)
    await viewExporter.asset(assetPath, view, valueFiles)
    logger.success(`Exported '${view}' view`)
  }

  const viewHandler = async (path) => {
    const logger = new Signale()
    const valueFiles = await getValueFiles()
    const view = path.slice(`${srcPath}/views/`.length).split('/')[0]
    const viewExporter = require('./view')
    logger.await(`Exporting '${view}' view`)

    await copy(path)
    await viewExporter(view, valueFiles)
    logger.success(`Exported '${view}' view`)
  }

  const valueHandler = async (path) => {
    const logger = new Signale()
    logger.await(`Exporting '${'src' + path.slice(srcPath.length)}' asset`)
    _valueFiles = null

    await copy(path)
    await values()
    logger.success(`Exported '${'src' + path.slice(srcPath.length)}' asset`)
  }

  const valueUnlinkHandler = async (path) => {
    const logger = new Signale()
    logger.await(`Removing '${'src' + path.slice(srcPath.length)}' asset`)
    _valueFiles = null

    await unlinkHandler(path)
    await values()
    logger.success(`Removed '${'src' + path.slice(srcPath.length)}' asset`)
  }

  const copy = async path => {
    return fs.copy(path, path.replace(srcPath, bwd))
  }

  const unlinkHandler = async path => {
    return fs.unlink(path.replace(srcPath, bwd))
  }

  const viewDirWatcher   = watch(`${srcPath}/views/*`)
  const viewRootWatcher  = watch(`${srcPath}/views/*/view.pug`)
  const viewTmplWatcher  = watch(`${srcPath}/views/*/templates/**/*.pug`)
  const viewAssetsWatcher = watch(`${srcPath}/views/*/assets/**/*`)

  const componentDirWatcher   = watch(`${srcPath}/components/*`)
  const componentFilesWatcher = watch(`${srcPath}/components/*/**/*.{js,pug,styl}`)

  const valueFilesWatcher = watch(`${srcPath}/values/**/*.{pug,styl}`)

  viewRootWatcher.on('change',       viewRootHandler)
  viewTmplWatcher.on('add',          viewTemplatesHandler)
  viewTmplWatcher.on('change',       viewTemplatesHandler)
  viewDirWatcher.on('add',           viewHandler)
  viewAssetsWatcher.on('add',        viewAssetHandler)
  viewAssetsWatcher.on('change',     viewAssetHandler)
  componentDirWatcher.on('add',      componentHandler)
  componentFilesWatcher.on('add',    componentHandler)
  componentFilesWatcher.on('change', componentHandler)
  valueFilesWatcher.on('add',        valueHandler)
  valueFilesWatcher.on('change',     valueHandler)

  viewDirWatcher.on('unlink', unlinkHandler)
  viewTmplWatcher.on('unlink', unlinkHandler)
  viewAssetsWatcher.on('unlink', unlinkHandler)
  componentDirWatcher.on('unlink', unlinkHandler)
  componentFilesWatcher.on('unlink', unlinkHandler)
  valueFilesWatcher.on('unlink', valueUnlinkHandler)
}

module.exports = {
  export: series(parallel(clean, prepare), values),
  watch: watcher,
  clean, prepare, views, components, values,
}
