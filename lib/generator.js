const pkg = require('../package.json')
const program = require('commander')
const signale = require('signale')
const prompts = require('prompts')
const path = require('path')
const fs = require('fs-extra')
const pug = require('pug')
const stylus = require('stylus')

program.version(pkg.version)

program
  .command('create [dir]')
  .action((dir, cmd) => {
    const cwd = process.cwd()

    if (!dir) dir = cwd
    dir = path.relative(cwd, dir)
    dir = dir === '' ? '.' : dir

    fs.emptyDirSync(dir)
    signale.info(`Creating new static-waffle project in ${dir}`)

    const srcDir = __dirname + '/../template/'
    fs.copySync(srcDir, dir, {
      filter (src, dest) {
        if (src.split('/').slice(-1)[0].includes('.')) {
          signale.success(`${path.relative(srcDir, src)} -> ${dest}`)
        }
        return true
      }
    })

    signale.success('Successfully created new project')
  })

program
  .command('export [dir]')
  .action((dir, cmd) => {
    const cwd = process.cwd()

    if (!fs.existsSync(`${cwd}/waffle.json`)) {
      signale.error('Not a static-waffle project')
      return
    }

    if (!dir) dir = 'dist'
    dir = path.relative(cwd, dir)

    if (dir === '') {
      signale.error('Cannot export to the project root')
      return
    }

    fs.emptyDirSync(dir)
    signale.info(`Exporting src/ to ${dir}/`)

    // Export views
    const viewDir = `src/views`
    for (const viewName of fs.readdirSync(viewDir)) {
      // Export plain view
      const indexPug = `${viewDir}/${viewName}/index.pug`
      const content = pug.renderFile(indexPug, {
        view: viewName,
      })

      const indexHtml = `${dir}/${viewName}.html`
      fs.writeFileSync(indexHtml, content)
      signale.success(`${indexPug} -> ${indexHtml}`)

      // Export assets
      const srcAssets = `${viewDir}/${viewName}/assets`
      fs.copySync(srcAssets, `${dir}/${viewName}/assets`, {
        filter (src, dest) {
          if (src.split('/').slice(-1)[0].includes('.')) {
            const ext = src
              .split('/')
              .slice(-1)[0]
              .match(/[^.]+(.+)$/)[1]
              .replace(/\.min/g, '')

            const next = (err, content) => {
              if (err) {
                signale.error(err)
                return
              }

              dest = dest.replace('.styl', '.css')
              fs.outputFileSync(dest, content.toString())
              signale.success(`${src} -> ${dest}`)
            }

            switch (ext) {
              case '.styl':

                stylus.render(fs.readFileSync(src).toString(), next)
                break;
              default:
                next(null, fs.readFileSync(src).toString())
            }
            return false
          }
          return true
        }
      })
    }

    signale.success('Successfully exported project')
  })

program.parse(process.argv)
