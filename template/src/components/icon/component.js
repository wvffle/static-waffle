export default {
  name: `icon`,
  lazy: false,
  functional: true,
  render (h, ctx) {
    const { text } = ctx.slots().default[0]

    return h('i', {
      'class': {
        eva: true,
        vmiddle: true,
        [`eva-${text}`]: true,
        [ctx.data.staticClass]: true,
      },
    })
  }
}
