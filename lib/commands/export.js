const rollup = require('rollup')
const stylus = require('stylus')
const fs = require('fs-extra')
const pug = require('pug')

require('commander')
  .command('export [dir]')
  .action((dir, cmd) => {
    const cwd = process.cwd()

    const renderPug = (file, options = {}) => {
      const app = require(`${cwd}/waffle.json`)
      const content = `${fs.readFileSync(file)}`

      return pug.render(content, {
        ...options,
        app,
      })
    }

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
      const content = renderPug(indexPug, {
        view: viewName,
        basedir: `${cwd}/src`,
        routeDecorator: renderPug(`${cwd}/src/layouts/route_decorator.pug`),
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
        const template = renderPug(templateFile, {
          basedir: `${cwd}/src`,
        })

        fs.outputFileSync(`${dir}/${viewName}/templates/${templateName}.tmpl`, `${template}`)
        signale.success(`${templateFile} -> ${dir}/${viewName}/templates/${templateName}.tmpl`)
      }
    }

    // Export components
    const componentsDir = `src/components`
    const styledComponents = {}

    for (const componentName of fs.readdirSync(componentsDir)) {
      if (componentName === 'rollup.js') continue

      const camelComponentName = camelcase(componentName)

      // Export templates
      const templateFile = `${componentsDir}/${componentName}/template.pug`
      if (fs.existsSync(templateFile)) {
        const template = renderPug(templateFile)
        fs.outputFileSync(`${dir}/components/${camelComponentName}.tmpl`, `${template}`)
        signale.success(`${templateFile} -> ${dir}/components/${camelComponentName}.tmpl`)
      }

      // Export styles
      const cssFile = `${componentsDir}/${componentName}/style.styl`
      if (fs.existsSync(cssFile)) {
        styledComponents[camelComponentName] = true
        const renderer = stylus(fs.readFileSync(cssFile).toString())
        require('utilus')()(renderer)

        renderer
          .set('filename', cssFile)
          .include(require('nib').path)
          .import('nib')
          .import('utilus')

        for (const file of values.styl) {
          renderer.import(`${cwd}/${file}`)
        }

        renderer.render((err, css) => {
          if (err) {
            signale.error(`${templateFile} -> ${dir}/components/${camelComponentName}.css`)
            return signale.error(err)
          }

          fs.outputFileSync(`${dir}/components/${camelComponentName}.css`, `${css}`)
          signale.success(`${templateFile} -> ${dir}/components/${camelComponentName}.css`)
        })
      }
    }

    // Export components.js
    (async () => {
      await fs.copy(`${__dirname}/rollup.js`, `${componentsDir}/rollup.js`)

      const bundle = await rollup.rollup({
        input: `${componentsDir}/rollup.js`,
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

      await fs.unlink(`${componentsDir}/rollup.js`)
      await fs.outputFile(`${dir}/components.js`, code)

      signale.success(`+ ${dir}/components.js`)
      signale.success('Successfully exported project')
    })()
  })
