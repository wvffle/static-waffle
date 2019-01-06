const signale = require('signale')
const fs = require('fs-extra')
const ejs = require('ejs')

require('commander')
  .command('component <name>')
  .action((name, cmd) => {
    const cwd = process.cwd()
    const root = `${__dirname}/../..`

    if (fs.existsSync(`${cwd}/src/components/${name}`)) {
      signale.error(`Component ${name} already exists`)
      return
    }

    const componentDir = `${root}/template/src/components/component`
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
