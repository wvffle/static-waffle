/* global Vue err */
Vue.component(`error`, (resolve, reject) => {
  axios
    .get(`components/error.tmpl`)
    .then(response => {
      resolve({
        template: response.data,
        props: {
          err: {
            type: Object,
            default () {
              return !_waffle.err ? {} : _waffle.err
            },
          },
        },
        data () {
          const faces = [ '(;´༎ຶД༎ຶ`)', '⚆ _ ⚆', '｡゜(｀Д´)゜｡', '¬_¬', '(ʘᗩʘ\')', 'ಥ_ಥ', '(ノಠ益ಠ)ノ彡┻━┻', '>.<' ]
          const face  = faces[Math.random() * faces.length ^ 0]

          return { face }
        },
      })
    })
    .catch(reject)

})
