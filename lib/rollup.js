import * as components from './**/component.js'

Object.keys(components).map(c => {
  const component = components[c]

  Vue.component(component.name, (resolve, reject) => {
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
      return resolve(component)
    }

    axios
      .get(`components/${component.name}.tmpl`, { responseType: 'text' })
      .then(response => {
        resolve({
          template: response.data.replace(/%view%/g, _waffle.view),
          ...component,
        })
      })
  })
})
