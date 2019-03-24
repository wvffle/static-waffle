export default {
  name: `waff-footer`,
  lazy: false,
  props: [
    'year',
    'company',
    'copyright',
  ],
  data () {
    return {
      name: `waff-footer`,
      comments: [
        'using ⌨️',
        'for a slice of 🍕',
        'with a blessing of the 🐗',
        'for a bottle of 🍷',
        'for some 🍟',
        'with some vegan 🥗',
        'with a vegan 🌮',
        'with 🥓 and 🥓 and 🥓',
        'with a 🥥🌰',
        'faster than cooking 🍝',
        'for an empty 🍽',
        'for a 🍰 that was\'t a lie',
        'in no ⏱',
        'with ❤️',
        'with 🧡',
      ],
    }
  },
  computed: {
    comment () {
      const index = _waffle.app
        .split('')
        .reduce((a, b) => a + b.charCodeAt(0), 0)

      const { comments } = this

      return comments[index % comments.length]
    },
    yearspan () {
      const { year } = this
      const current = new Date().getFullYear()

      if (!year) {
        return current
      }

      if (+year === current) {
        return year
      }

      return `${year} - ${current}`
    }
  }
}
