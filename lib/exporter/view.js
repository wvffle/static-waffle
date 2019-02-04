const { src, dest, parallel } = require('gulp')

const stylus = require('gulp-stylus')
const rename = require('gulp-rename')
const originalPug = require('pug')
const utilus = require('utilus')
const pug = require('gulp-pug')
const nib = require('nib')

const { app, bwd } = require('../utils')

module.exports = function view (view, valueFiles, routeDecoratorPug = '') {
  const pugOptions = {
    basedir: bwd,
    locals: {
      view,
      app,
    },
  }

  const routeDecorator = originalPug.render(routeDecoratorPug, {
    ...pugOptions,
    filename: `${bwd}/layouts/route_decorator.pug`,
  })

  pugOptions.locals.routeDecorator = routeDecorator

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

  const main = src(`${bwd}/views/${view}/view.pug`)
    .pipe(pug(pugOptions))
    .pipe(rename({ basename: view }))
    .pipe(dest('dist'))

  const templates = src(`${bwd}/views/${view}/templates/**/*.pug`)
    .pipe(pug(pugOptions))
    .pipe(rename({ extname: '.tmpl' }))
    .pipe(dest(`dist/${view}/templates`))

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
