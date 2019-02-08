const readdir = require('recursive-readdir')
const ignore = require('./ignore')
const stylus = require('stylus')
const mm = require('micromatch')
const fs = require('fs-extra')
const gulp = require('gulp')
const path = require('path')
const pug = require('pug')

const cwd = process.cwd()
const app = require(`${cwd}/package.json`)

const root = `${__dirname}/..`
const twd = path.normalize(`${root}/template`)
const bwd = `/tmp/${app.name}`

let defaultFiles = false
let ignoredFiles = false

const getProjectOptions = (dir = cwd) => {
  try {
    const { waffle } = require(`${dir}/package.json`)
    return waffle
  } catch (e) {
    return false
  }
}

const promisify = (fn) => (...args) => {
  const stream = fn(...args)

  const next = async () => {
    const promise = new Promise(resolve => {
      /*
      if (stream instanceof Promise) {
        stream.then(resolve)
        return
      }
      */

      stream.on('end', resolve)
    })

    return promise
  }

  next.pipe = (...args) => {
    stream.pipe(...args)
    return next
  }

  next.on = (...args) => {
    stream.on(...args)
    return next
  }

  return next
}
const parallel = (...args) => async () => {
  const fns = args.map(fn => {
    if (Array.isArray(fn)) {
      return parallel(...fn)()
    }

    if (fn instanceof Function) {
      return fn()
    }

    return fn
  })

  return Promise.all(fns)
}

module.exports = {
  app,
  twd,
  cwd,
  bwd,
  root,
  getProjectOptions,

  src: promisify(gulp.src),
  series: (...args) => async () => {
    for (const fn of args) {
      await (fn instanceof Function ? fn() : fn)
    }
  },
  parallel,

  isWaffleProject (dir) {
    const options = getProjectOptions(dir)
    return !!options
  },
  getFile (file) {
    return `${cwd}/build/${file}`
  },

  async defaultFiles () {
    if (defaultFiles) return defaultFiles
    return defaultFiles = readdir(twd)
  },

  async ignoredFiles () {
    if (ignoredFiles) return ignoredFiles

    const defaultFiles = (await this.defaultFiles()).map(f => path.relative(twd, f))
    return ignoredFiles = mm.not(mm(defaultFiles, ignore.compactIgnoredFiles), ignore.ignoredFiles)
  },

  async renderPugFile (file, options = {}, valueFiles = []) {
    const { getFile } = this
    const content = await fs.readFile(getFile(file))
    return this.renderPug(content, file, options, valueFiles)
  },

  async renderPug (content, filename, options = {},  valueFiles = []) {
    const { getFile } = this
    const file = getFile(filename)
    const app = require(`${cwd}/package.json`)

    const includes = valueFiles.map(f => {
      const file = f.replace(new RegExp(`^${getFile('')}`), '')
      return `include /${file}`
    }).join('\n') + (valueFiles.length > 0 ? '\n' : '')

    const res = content.toString().replace(/^(extends [^\n]+|)/, `$1\n${includes}`)

    return pug.render(res, {
      filename: getFile(file),
      basedir: `${cwd}/build`,
      ...options,
      app,
    })
  },

  async renderStylusFile (file, valueFiles = []) {
    const { getFile } = this

    const content = await fs.readFile(getFile(file))
    return this.renderStylus(content, file, valueFiles)
  },

  async renderStylus (content, filename, valueFiles = []) {
    const file = this.getFile(filename)
    const renderer = stylus(content.toString())

    require('utilus')()(renderer)

    renderer
      .set('filename', file)
      .include(require('nib').path)
      .import('nib')
      .import('utilus')

    for (const valueFile of valueFiles) {
      renderer.import(valueFile)
    }

    return new Promise((resolve, reject) => {
      renderer.render((err, css) => {
        if (err) {
          return reject(err)
        }

        return resolve(css)
      })
    })
  }
}
