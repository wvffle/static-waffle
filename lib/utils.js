const readdir = require('recursive-readdir')
const ignore = require('./ignore')
const stylus = require('stylus')
const mm = require('micromatch')
const fs = require('fs-extra')
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

module.exports = {
  twd,
  cwd,
  root,
  getProjectOptions,
  isWaffleProject (dir) {
    const options = getProjectOptions(dir)
    return !!options
  },
  getFile (file) {
    return `${cwd}/.tmp/${file}`
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

  async renderPug (file, options = {}, valueFiles = []) {

    const { getFile } = this
    const app = require(`${cwd}/package.json`)

    const content = await fs.readFile(getFile(file))
    const includes = valueFiles.map(f => {
      const file = f.replace(new RegExp(`^${this.getFile('')}`), '')
      return `include /${file}`
    }).join('\n') + (valueFiles.length > 0 ? '\n' : '')

    const res = content.toString().replace(/^(extends [^\n]+|)/, `$1\n${includes}`)

    return pug.render(res, {
      filename: getFile(file),
      basedir: `${cwd}/.tmp`,
      ...options,
      app,
    })
  },

  async renderStylus (file, valueFiles) {
    const content = await fs.readFile(file)
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
