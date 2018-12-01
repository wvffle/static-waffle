const camelcase = require('camelcase')
const pkg = require('../package.json')
const program = require('commander')
const signale = require('signale')
const prompts = require('prompts')
const rollup = require('rollup')
const stylus = require('stylus')
const fs = require('fs-extra')
const path = require('path')
const pug = require('pug')
const ejs = require('ejs')

program.version(pkg.version)

program
  .command('init [dir]')
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

        // Don't copy component template
        if (src.endsWith('components/component')) {
          return false
        }

        if (src.split('/').slice(-1)[0].includes('.')) {
          signale.success(`${path.relative(srcDir, src)} -> ${dest}`)
        }

        return true
      }
    })

    signale.success('Successfully created new project')
  })

program
  .command('component <name>')
  .action((name, cmd) => {
    const cwd = process.cwd()

    if (fs.existsSync(`${cwd}/src/components/${name}`)) {
      signale.error(`Component ${name} already exists`)
      return
    }

    const componentDir = `${__dirname}/../template/src/components/component`
    const files = fs.readdirSync(componentDir)

    Promise.all(files.map(f => new Promise((resolve, reject) => {
      ejs.renderFile(`${componentDir}/${f}`, { name }, {}, (err, str) => {
        if (err) {
          return reject(err)
        }

        const dest = `src/components/${name}/${f.slice(0, -4)}`
        fs.outputFileSync(`${cwd}/${dest}`, str)
        signale.success(`+ ${dest}`)
        resolve()
      })
    }))).then(() => {
      signale.success(`Successfully created component ${name}`)
    }).catch(err => {
      signale.error(err)
    })
  } )

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

    const values = {
      pug: [],
      styl: [],
    }
    const valuesDir = `src/values`
    for (const file of fs.readdirSync(valuesDir)) {
      const ext = path.extname(file).slice(1, Infinity)
      ;(values[ext] = (values[ext] || [])).push(`${valuesDir}/${file}`)
    }

    // Export views
    const viewDir = `src/views`
    for (const viewName of fs.readdirSync(viewDir)) {
      // Export plain view
      const indexPug = `${viewDir}/${viewName}/view.pug`
      const content = pug.renderFile(indexPug, {
        view: viewName,
        basedir: `${cwd}/src`,
      })

      const indexHtml = `${dir}/${viewName}.html`
      fs.outputFileSync(indexHtml, content)
      signale.success(`${indexPug} -> ${indexHtml}`)

      // Export assets
      const srcAssets = `${viewDir}/${viewName}/assets`
      fs.copySync(srcAssets, `${dir}/${viewName}/assets`, {
        filter (src, dest) {
          if (src.split('/').slice(-1)[0].includes('.')) {
            const ext = path.extname(src)

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

                const renderer = stylus(fs.readFileSync(src).toString())
                require('utilus')()(renderer)

                renderer
                  .set('filename', src)
                  .include(require('nib').path)
                  .import('nib')
                  .import('utilus')

                for (const file of values.styl) {
                  renderer.import(`${cwd}/${file}`)
                }

                renderer.render(next)
                break

              case '.jpg':
              case '.png':
                fs.copySync(src, dest)
                signale.success(`${src} -> ${dest}`)
                break

              default:
                next(null, fs.readFileSync(src).toString())
            }
            return false
          }
          return true
        }
      })

      // Export templates
      const templatesDir = `${viewDir}/${viewName}/templates`

      for (const templateName of fs.readdirSync(templatesDir).map(f => f.replace(/\..+?$/, ''))) {
        const templateFile = `${templatesDir}/${templateName}.pug`
        const template = pug.renderFile(templateFile, {
          basedir: `${cwd}/src`,
        })

        fs.outputFileSync(`${dir}/${viewName}/templates/${templateName}.tmpl`, `${template}`)
        signale.success(`${templateFile} -> ${dir}/${viewName}/templates/${templateName}.tmpl`)
      }
    }

    // Export components
    const componentsContent = {}
    const componentsDir = `src/components`

    for (const componentName of fs.readdirSync(componentsDir)) {
      if (componentName === 'rollup.js') continue

      const content = fs.readFileSync(`${componentsDir}/${componentName}/component.js`)
      componentsContent[componentName + '.es'] = `${content}`

      const templateFile = `${componentsDir}/${componentName}/template.pug`
      if (!fs.existsSync(templateFile)) continue

      const template = pug.renderFile(templateFile, {})
      fs.outputFileSync(`${dir}/components/${componentName}.tmpl`, `${template}`)
      signale.success(`${templateFile} -> ${dir}/components/${componentName}.tmpl`)
    }

    (async () => {

      fs.copySync(`${__dirname}/rollup.js`, `${componentsDir}/rollup.js`)

      const bundle = await rollup.rollup({
        input: `${componentsDir}/rollup.js`,
        plugins: [
          require('rollup-plugin-glob-import')({
            rename (name, id) {
              return camelcase(path.basename(path.dirname(id)))
            }
          }),
        ]
      })

      const { code } = await bundle.generate({
        file: `${dir}/components.js`,
        format: 'iife',
      })

      fs.unlinkSync(`${componentsDir}/rollup.js`)

      /*
      const result = uglify.minify(componentsContent)
      const { code, error } = result
      if (error) {
        signale.error(error)
        return
      }
      */

      fs.outputFileSync(`${dir}/components.js`, code)
      signale.success(`+ ${dir}/components.js`)

      signale.success('Successfully exported project')
    })()
  })

program.parse(process.argv)
