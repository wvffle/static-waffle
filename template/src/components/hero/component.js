export default {
  name: `hero`,
  lazy: false,
  props: {
    small: { default: false },
    fixed: { default: false },
    bg:    { default: '' },
    dim:   { default: 0 },
  },
  computed: {
    style () {
      return {
        backgroundImage: this.background,
        backgroundColor: this.background,
        backgroundAttachment: this.attach,
      }
    },

    background () {
      const colors = [
        '#',
        'rgba(',
        'hsla(',
        'rgb(',
        'hsl(',
      ]

      if (colors.some(c => this.bg.startsWith(c))) {
        return this.bg
      }

      return `url(${waffle.asset(this.bg)})`
    },

    attach () {
      return this.fixed ? 'fixed' : 'local'
    },
  }
}
