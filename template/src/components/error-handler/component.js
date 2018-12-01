export default {
  name: `error-handler`,
  functional: true,
  render (h, ctx) {
    if (!!_waffle.err) {
      return h('error')
    }

    return ctx.slots().default
  },
}
