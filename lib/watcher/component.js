const { componentFetcher, getValueFiles } = require('../exporter')
const { createHandler, unlinkHandler, copy } = require('./')
const { cwd, bwd } = require('../utils')
const { watch } = require('gulp')

const componentExporter = require('../exporter/component')
const fs = require('fs-extra')

const srcPath = `${cwd}/src`
const componentDirWatcher   = watch(`${srcPath}/components/*`)
const componentFilesWatcher = watch(`${srcPath}/components/*/**/*.{js,pug,styl}`)

const handler = createHandler(async (path, stats) => {
  const component = path.slice(`${srcPath}/components/`.length).split('/')[0]

  await copy(path)
  const components = await fs.readdir(`${bwd}/components`)

  await Promise.all([
    componentExporter(component, await getValueFiles()),
    componentFetcher(components)(),
  ])
})

componentDirWatcher.on('add',      handler)
componentFilesWatcher.on('add',    handler)
componentFilesWatcher.on('change', handler)

componentDirWatcher.on('unlink',   unlinkHandler)
componentFilesWatcher.on('unlink', unlinkHandler)
