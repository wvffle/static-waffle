const camelcase = require('camelcase')
const utils = require('../utils')
const rollup = require('rollup')
const fs = require('fs-extra')
const path = require('path')

module.exports = async (component, styledComponents, values, dir) => {
  const camelName = camelcase(component)
  const srcDir = `${utils.cwd}/.tmp/components/${component}`

  const queue = []

  // Export templates
  const srcTemplate = `${srcDir}/template.pug`
  if (await fs.exists(srcTemplate)) {
    queue.push((async () => {
      const content = await utils.renderPug(`components/${component}/template.pug`, {}, values.pug)
      await fs.outputFile(`${dir}/components/${camelName}.tmpl`, content)
    })())
  }

  // Export styles
  const srcStyle = `${srcDir}/style.styl`
  if (await fs.exists(srcStyle)) {
    styledComponents[camelName] = true

    queue.push((async () => {
      const content = await utils.renderStylus(srcStyle, values.styl)
      await fs.outputFile(`${dir}/components/${camelName}.css`, content)
    })())
  }

}

module.exports.all = async (styledComponents, dir) => {
  const srcRollup = `${utils.twd}/../lib/rollup.js`
  const distRollup = `${utils.cwd}/.tmp/components/rollup.js`
  await fs.copy(srcRollup, distRollup)

  const bundle = await rollup.rollup({
    input: distRollup,
    plugins: [
      require('rollup-plugin-glob-import')({
        rename (name, id) {
          return camelcase(path.basename(path.dirname(id)))
        }
      }),
      require('rollup-plugin-replace')({
        STYLED_COMPONENTS: JSON.stringify(styledComponents),
      }),
    ]
  })

  const { output } = await bundle.generate({
    file: `${dir}/components.js`,
    format: 'iife',
  })

  const { code } = output[0]

  await Promise.all([
    fs.remove(distRollup),
    fs.outputFile(`${dir}/components.js`, code)
  ])
}
