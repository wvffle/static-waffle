const { createHandler, unlinkHandler, copy } = require('./')
const { getValueFiles } = require('../exporter')
const { cwd } = require('../utils')
const { watch } = require('gulp')

const viewExporter = require('../exporter/view')

const srcPath = `${cwd}/src`
const viewDirWatcher    = watch(`${srcPath}/views/*`)
const viewRootWatcher   = watch(`${srcPath}/views/*/view.pug`)
const viewTmplWatcher   = watch(`${srcPath}/views/*/templates/**/*.pug`)
const viewAssetsWatcher = watch(`${srcPath}/views/*/assets/**/*`)


const viewRootHandler = createHandler(async (path) => {
  const view = path.slice(`${srcPath}/views/`.length).split('/')[0]

  await copy(path)
  await viewExporter.root(view, await getValueFiles())
})

const viewTemplatesHandler = createHandler(async (path) => {
  const view = path.slice(`${srcPath}/views/`.length).split('/')[0]

  await copy(path)
  await viewExporter.templates(view, await getValueFiles())
})

const viewAssetHandler = createHandler(async (path) => {
  const view = path.slice(`${srcPath}/views/`.length).split('/')[0]
  const assetPath = path.slice(`${srcPath}/`.length)

  await copy(path)
  await viewExporter.asset(assetPath, view, await getValueFiles())
})

const viewHandler = createHandler(async (path) => {
  const view = path.slice(`${srcPath}/views/`.length).split('/')[0]

  await copy(path)
  await viewExporter(view, await getValueFiles())
})

viewRootWatcher.on('change',   viewRootHandler)

viewTmplWatcher.on('add',      viewTemplatesHandler)
viewTmplWatcher.on('change',   viewTemplatesHandler)

viewDirWatcher.on('add',       viewHandler)

viewAssetsWatcher.on('add',    viewAssetHandler)
viewAssetsWatcher.on('change', viewAssetHandler)

viewDirWatcher.on('unlink',    unlinkHandler)
viewTmplWatcher.on('unlink',   unlinkHandler)
viewAssetsWatcher.on('unlink', unlinkHandler)
