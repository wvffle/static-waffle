const { src, dest, parallel } = require('gulp')

const stylus = require('gulp-stylus')
const rename = require('gulp-rename')
const originalPug = require('pug')
const each = require('gulp-each')
const utilus = require('utilus')
const pug = require('gulp-pug')
const path = require('path')
const nib = require('nib')
const fs = require('fs')

const { app, bwd } = require('../utils')

module.exports = function view (view, valueFiles) {
  const pugOptions = module.exports.pugOptions(view)

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

  const assetsGlob = `${bwd}/views/${view}/assets/**/*`

  const main = module.exports.root(view, valueFiles)
  const templates = module.exports.templates(view, valueFiles)

  const assetsStyles = src(`${assetsGlob}.styl`)
    .pipe(stylus(stylusOptions))
    .pipe(dest(`dist/${view}/assets`))

  const assets = src([
    assetsGlob,
    `!${assetsGlob}.styl`,
  ]).pipe(dest(`dist/${view}/assets`))

  return parallel([
    main,
    templates,
    assets,
    assetsStyles,
  ].map(t => () => t))
}

module.exports.pugOptions = (view, root = false) => {

  const pugOptions = {
    basedir: bwd,
    locals: {
      view,
      app,
    },
  }

  if (root) {
    const routeDecoratorPug = `${fs.readFileSync(`${bwd}/layouts/route_decorator.pug`)}`
    const routeDecorator = originalPug.render(routeDecoratorPug, {
      ...pugOptions,
      filename: `${bwd}/layouts/route_decorator.pug`,
    })

    pugOptions.locals.routeDecorator = routeDecorator
  }

  return pugOptions
}

module.exports.root = (view, valueFiles) => {
  const pugOptions = module.exports.pugOptions(view, true)

  return src(`${bwd}/views/${view}/view.pug`)
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
    .pipe(rename({ basename: view }))
    .pipe(dest('dist'))
}

module.exports.templates = (view, valueFiles) => {
  const pugOptions = module.exports.pugOptions(view)

  return src(`${bwd}/views/${view}/templates/**/*.pug`)
    .pipe(each((content, t, next) => {
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
    .pipe(rename({ extname: '.tmpl' }))
    .pipe(dest(`dist/${view}/templates`))
}

module.exports.asset = (assetPath, view, valueFiles) => {
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

  const destPath = `dist/${path.dirname(assetPath.slice('views/'.length))}`

  if (assetPath.endsWith('.styl')) {
    return src(`${bwd}/${assetPath}`)
      .pipe(stylus(stylusOptions))
      .pipe(dest(destPath))
  }

  return src(`${bwd}/${assetPath}`)
    .pipe(dest(destPath))
}
