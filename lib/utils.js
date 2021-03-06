const readdir = require('recursive-readdir')
const ignore = require('./ignore')
const stylus = require('stylus')
const mm = require('micromatch')
const fs = require('fs-extra')
const gulp = require('gulp')
const path = require('path')
const pug = require('pug')

const cwd = process.cwd()

const root = `${__dirname}/..`
const twd = path.normalize(`${root}/template`)

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

const app = getProjectOptions()
const bwd = `/tmp/${app.name}`

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

  src: (...args) => {
    let stream = gulp.src(...args)
    const originalStream = stream
    const errors = []

    const next = new Promise((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    next.pipe = (obj, ...args) => {
      stream = stream.pipe(obj.on('error', err => {
        originalStream.emit('error', err)
      }), ...args)

      return next
    }

    next.on = (...args) => {
      stream.on(...args)
      return next
    }

    return next
  },
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

  async defaultFiles () {
    if (defaultFiles) return defaultFiles
    return defaultFiles = readdir(twd)
  },

  async ignoredFiles () {
    if (ignoredFiles) return ignoredFiles

    const [absoluteDefaultFiles, srcViews] = await Promise.all([
      this.defaultFiles(),
      fs.readdir(`${cwd}/src/views`),
    ])

    const defaultFiles = absoluteDefaultFiles.map(f => path.relative(twd, f))

    // Apply views
    const indexViewFiles = defaultFiles.filter(f => f.startsWith('src/views/index'))
    for (const view of srcViews) {
      if (view === 'index') continue

      for (const viewFile of indexViewFiles) {
        defaultFiles.push(viewFile.replace(/^src\/views\/index/, `src/views/${view}`))
      }
    }

    return ignoredFiles = mm.not(mm(defaultFiles, ignore.compactIgnoredFiles), ignore.ignoredFiles)
  },
}
