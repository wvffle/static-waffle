const micromatch = require('micromatch')
const camelcase = require('camelcase')
const pkg = require('../package.json')
const program = require('commander')
const signale = require('signale')
const prompts = require('prompts')
const ignore = require('./ignore')
const rollup = require('rollup')
const stylus = require('stylus')
const fs = require('fs-extra')
const path = require('path')
const pug = require('pug')
const ejs = require('ejs')

program.version(pkg.version)

program
  .command('init [dir]')
  .action(async (dir, cmd) => {
    const cwd = process.cwd()

    if (!dir) dir = cwd
    dir = path.relative(cwd, dir)
    dir = dir === '' ? '.' : dir

    signale.info(`Creating new static-waffle project in '${dir}'`)

    const appFile = `${dir === '.' ? cwd : dir}/waffle.json`

    if (await fs.exists(appFile)) {
      const { name } = require(appFile)
      signale.warn(`Project '${name}' already exists in '${dir}'`)

      const { next } = await prompts({
        type: 'confirm',
        name: 'next',
        message: `Initialize new project in '${dir}'?`,
        initial: false,
      })

      if (!next) return
    }

    const options = await prompts([
      {
        type: 'text',
        name: 'name',
        message: 'Application name',
        initial: path.basename(dir === '.' ? cwd : dir),
      },
      {
        type: 'select',
        name: 'structure',
        message: 'File structure type',
        choices: [
          { title: 'Compact', value: 'compact' },
          { title: 'Full', value: 'full' },
        ],
        initial: 0,
      },
    ])

    await fs.writeFile(appFile, JSON.stringify(options, null, 2))
    signale.success(`+ waffle.json`)

    const srcDir = __dirname + '/../template/'
    fs.copySync(srcDir, dir, {
      filter (src, dest) {
        const relativeSrc = path.relative(srcDir, src)

        if (options.structure === 'compact') {

          // Do not copy compact files
          if (micromatch.some(relativeSrc, ignore.compactIgnoredFiles)) {
            return false
          }
        }

        // Do not copy ignored files
        if (micromatch.some(relativeSrc, ignore.ignoredFiles)) {
          return false
        }

        if (src.split('/').slice(-1)[0].includes('.')) {
          signale.success(`${relativeSrc} -> ${dest}`)
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

program.parse(process.argv)
