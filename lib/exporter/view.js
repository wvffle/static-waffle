const utils = require('../utils')
const fs = require('fs-extra')
const path = require('path')

module.exports = async (view, viewFiles, values, dir) => {
  const options = {
    view,
  }

  // Export view file
  const viewFile = `views/${view}/view.pug`
  const routeDecorator = await utils.renderPug(`layouts/route_decorator.pug`, options, values.pug, true)
  const viewFileContent = await utils.renderPug(viewFile, {
    ...options,
    routeDecorator,
  }, values.pug)

  await fs.outputFile(`${dir}/${view}.html`, viewFileContent)

  // Export all assets
  const assetFiles = viewFiles.filter(f => f.startsWith(`.tmp/views/${view}/assets`))
  const assetQueue = []

  for (const asset of assetFiles) {
    const ext = path.extname(asset)

    if (ext === '.styl') {
      assetQueue.push((async () => {
        const content = await utils.renderStylus(asset, values.styl)
        const dist = asset.replace(/^\.tmp\/views(\/.+\.)styl$/, (match, group) => dir + group + 'css')
        return fs.outputFile(dist, content)
      })())

      continue
    }

    const name = asset.replace('.tmp/views', dir)
    assetQueue.push(fs.copy(asset, name))
  }

  await Promise.all(assetQueue)

  // Export all templates
  const templatesDir = `${utils.cwd}/.tmp/views/${view}/templates`
  const templateFiles = await fs.readdir(templatesDir)

  const templateQueue = templateFiles.map(async f => {
    const templateName = f.replace(/\..+?$/, '')
    const templateFile = `views/${view}/templates/${f}`

    const template = await utils.renderPug(templateFile, {}, values.pug)

    return fs.outputFile(`${dir}/${view}/templates/${templateName}.tmpl`, `${template}`)
  })

  await Promise.all(templateQueue)
}
