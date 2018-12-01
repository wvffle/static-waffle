import * as components from './**/component.js'

Object.keys(components).map(c => {
  const component = components[c]

  Vue.component(component.name, (resolve, reject) => {
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
