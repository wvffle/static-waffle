const waffle = {
  styles: document.createElement('style'),

  async get (url, type = 'text') {
    const response = await fetch(url)
    return response[type]()
  },

  async import (url, ...args) {
    if (url.endsWith('.css')) {
      if (this.styles[url]) return
      this.styles[url] = true

      if (!url.startsWith('http')) {
        url = `https://cdn.jsdelivr.net/npm/${url}`
      }

      const style = document.createElement('link')
      style.rel = 'stylesheet'
      style.href = url
      document.head.appendChild(style)
      return style
    }

    if (url.startsWith('http')) {
      return System.import(url, ...args)
    }

    return System.import(`https://cdn.jsdelivr.net/npm/${url}`, ...args)
  },

  async loadStyle (component) {
    if (this.styles[component]) return
    this.styles[component] = true

    const data = await this.get(`components/styles/${component}.css`)
    this.styles.innerHTML += data
  },
}

document.head.appendChild(waffle.styles)
