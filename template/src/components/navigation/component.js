export default {
  name: `navigation`,
  lazy: false,
  props: ['fixed'],
  data () {
    const routePaths = Object.keys(routes)

    return {
      routes: routePaths,
    }
  },
}
