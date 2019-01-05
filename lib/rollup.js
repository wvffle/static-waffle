import * as components from './**/component.js'

const styled = STYLED_COMPONENTS

const resolver = (c, args, resolve) => {
  const component = components[c]
  const template = args.pop()

  if (template) {
    return resolve({
      template: template.data.replace(/%view%/g, _waffle.view),
      ...component,
    })
  }

  resolve(component)
}

Object.keys(components).map(c => {
  const component = components[c]

  Vue.component(c, (resolve, reject) => {
    const promises = []

    if (styled[c]) {
      promises.push(_waffle.loadStyle(c))
    }

    if (component.lazy) {
      component.methods = component.methods || {}

      component.methods.lazy = function () {
        this.$root.$emit('lazy-remove')
      }

      const bc = component.beforeCreate || function () {}
      component.beforeCreate = function () {
        this.$root.$emit('lazy-add')
        bc.apply(this, arguments)
      }
    }

    if (component.template || component.render) {
      return Promise.all(promises).then(args => {
        resolver(c, args, resolve)
      })
    }

    const request = axios.get(`components/${c}.tmpl`, { responseType: 'text' })
    promises.push(request)

    return Promise.all(promises).then(args => {
      resolver(c, args, resolve)
    })
  })
})
