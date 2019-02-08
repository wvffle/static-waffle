const { dest } = require('gulp')

const stylus = require('gulp-stylus')
const rename = require('gulp-rename')
const each = require('gulp-each')
const utilus = require('utilus')
const pug = require('gulp-pug')
const nib = require('nib')

const { app, bwd, src, parallel, series } = require('../utils')

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
        .replace(defaultRegex, 'const component = ')
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
    .pipe(each((content, f, next) => {
      let first = ''
      const lines = content.split('\n')

      if (lines[0].startsWith('extend')) {
        first = lines.shift()
      }

      const includes = valueFiles.pug
        .map(file => `include ${file.slice(bwd.length)}\n`)

      next(null, [ first, ...includes, ...lines ].join('\n'))
    }))
    .pipe(pug(pugOptions))
    .pipe(rename({ basename: component, extname: '.tmpl' }))
    .pipe(dest('dist/components/templates'))
    .on('finish', () => {
      hasTemplate = true
    })

  return async () => {
    await Promise.all([
      styles,
      templates,
    ])

    await main
  }
}
