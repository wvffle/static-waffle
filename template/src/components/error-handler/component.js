/* global Vue */
Vue.component(`error-handler`, {
  functional: true,
  render (h, ctx) {
    if (!!_waffle.err) {
      return h('error')
    }

    return ctx.slots().default
  },
})
