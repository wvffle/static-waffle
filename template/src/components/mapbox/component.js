export default {
  name: `mapbox`,
  lazy: false,
  props: {
    token: { type: String, required: true },
    styleUrl: { type: String, default: 'mapbox://styles/mapbox/light-v9' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    zoom: { type: Number, default: 17 },
    marker: { type: Boolean, default: false }
  },
  data () {
    const id = `map-${Math.round(Math.random() * 0xffffff).toString(16)}`
    return { id, name: 'mapbox' }
  },
  mounted () {
    this.center = [
      this.lat || 0,
      this.lng || 0,
    ]

    this.$nextTick(() => {
      mapboxgl.accessToken = this.token

      this.map = new mapboxgl.Map({
        style: this.styleUrl,
        container: this.id,
        zoom: this.zoom,
        center: this.center,
      })

      if (this.marker) {
        this.addMarker()
      }

    })
  },
  methods: {
    addMarker (center, options = {}) {
      new mapboxgl.Marker({ color: '#00aaff', ...options })
        .setLngLat(center || this.center)
        .addTo(this.map)
    }
  }
}
