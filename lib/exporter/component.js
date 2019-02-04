const { src, dest, parallel, series } = require('gulp')

const stylus = require('gulp-stylus')
const rename = require('gulp-rename')
const each = require('gulp-each')
const utilus = require('utilus')
const pug = require('gulp-pug')
const nib = require('nib')

const { app, bwd } = require('../utils')

const promisify = async stream => new Promise(resolve => stream.on('end', resolve))

module.exports = function component (component, valueFiles) {
  let hasStyle = false
  let hasTemplate = false

  const pugOptions = {
    basedir: bwd,
    locals: {
      app,
    },
  }

  const stylusOptions = {
    use: [
      nib(),
      utilus(),
    ],
    import: [
      'nib',
      'utilus',
      ...valueFiles.styl
    ]
  }

  const main = src(`${bwd}/components/${component}/component.js`)
    .pipe(rename({ basename: component }))
    .pipe(each((content, f, next) => {
      const defaultRegex = /(?:module\.exports\s+=\s+|export\s+default\s+)/g
      const exportRegex = /(?:module\.exports\.([^ ]+)\s+=\s+|export ([^ ]+)\s+)/g
      const newContent = content
        .replace(defaultRegex, 'var component = ')
        .replace(exportRegex, 'component.$1 = ')
        + `component.waffle_style = ${!hasStyle}\n`
        + `component.waffle_template = ${!hasTemplate}\n`

      next(null, newContent)
    }))
    .pipe(dest('dist/components'))

  const styles = src(`${bwd}/components/${component}/style.styl`, { allowEmpty: true })
    .pipe(stylus(stylusOptions))
    .pipe(rename({ basename: component }))
    .pipe(dest('dist/components/styles'))
    .on('finish', () => {
      hasStyle = true
    })

  const templates = src(`${bwd}/components/${component}/template.pug`, { allowEmpty: true })
    .pipe(pug(pugOptions))
    .pipe(rename({ basename: component, extname: '.tmpl' }))
    .pipe(dest('dist/components/templates'))
    .on('finish', () => {
      hasTemplate = true
    })

  return async () => {
    await Promise.all([
      promisify(styles),
      promisify(templates),
    ])

    await promisify(main)
  }
}
