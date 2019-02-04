const { src, dest, series, parallel, watch } = require('gulp')

const livereload = require('gulp-livereload')
const readdir = require('recursive-readdir')
const utils = require('../utils')
const fs = require('fs-extra')
const path = require('path')
const del = require('del')
const ejs = require('ejs')

// TODO: Fix gulp non async exporting
// TODO: Add pug value files

const cwd = process.cwd()
const srcPath = `${cwd}/src`

const { app, bwd } = utils

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
  const routeDecoratorPug = `${await fs.readFile(`${bwd}/layouts/route_decorator.pug`)}`

  const viewTasks = views.map(view => {
    const viewExporter = require('./view')
    return viewExporter(view, valueFiles, routeDecoratorPug)
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

  return series(parallel(...tasks), componentFetcher(components))()

}

const values = async () => {
  return parallel(views, components)()
}

const getValueFiles = async () => {
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

  return values
}

const watcher = async () => {
  livereload.listen()

  const valueFiles = await getValueFiles()

  const componentHandler = async (path, stats) => {
    const component = path.slice(`${srcPath}/components/`.length).split('/')[0]
    const componentExporter = require('./component')

    await copyHandler(path)
    const components = await fs.readdir(`${bwd}/components`)

    await Promise.all([
      componentExporter(component, valueFiles),
      componentFetcher(components)(),
    ])
  }

  const copyHandler = async path => {
    return fs.copy(path, path.replace(srcPath, bwd))

  }

  const unlinkHandler = async path => {
    return fs.unlink(path.replace(srcPath, bwd))
  }

  const componentDirWatcher   = watch(`${srcPath}/components/*`)
  const componentFilesWatcher = watch(`${srcPath}/components/*/*.{js,pug,styl}`)
  componentDirWatcher.on('add', componentHandler)
  componentFilesWatcher.on('add', componentHandler)
  componentFilesWatcher.on('change', componentHandler)

  componentDirWatcher.on('unlink', unlinkHandler)
  componentFilesWatcher.on('unlink', unlinkHandler)
}

module.exports = {
  export: series(parallel(clean, prepare), values),
  watch: watcher,
  clean, prepare, views, components, values,
}
