const { values, getValueFiles, _cache } = require('../exporter')
const { createHandler, unlinkHandler, copy } = require('./')
const { cwd } = require('../utils')
const { watch } = require('gulp')

const srcPath = `${cwd}/src`
const watcher = watch(`${srcPath}/values/**/*.{pug,styl}`)

const handler = createHandler(async path => {
  await copy(path)
  await values()
})

watcher.on('add', handler)
watcher.on('change', handler)
watcher.on('unlink', createHandler(async path => {
  _cache.valueFiles = null
  await unlinkHandler(path)
  await values()
}))
