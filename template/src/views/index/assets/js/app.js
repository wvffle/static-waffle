const router = new VueRouter({
  mode: 'hash',
  base: `/${_waffle.view}/`,
  routes: Object.keys(routes).map(path => {
    const route = routes[path]

    let name = undefined
    let tpath = route

    if (route.push !== undefined) {
      tpath = route[0]

      if (route.length > 1) {
        name = route[1]
      }
    }

    const component = async _ => {
      const req = await axios.get(`${_waffle.view || 'index'}/${tpath}.tmpl`)
      const template = req.data.replace(/%view%/g, _waffle.view)
      return { template, name }
    }

    return { path, name, component }
  })
})

Vue.use(VueRouter)

router.beforeEach((to, from, next) => {
  NProgress.start()
  next()
})

router.afterEach((to, from) => {

  if (to.name === 'notfound') {
    NProgress.done()
    return
  }

  NProgress.done()
})

const app = new Vue({
  router,
}).$mount('#app')
