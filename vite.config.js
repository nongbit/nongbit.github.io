import { resolve } from 'path'
import { defineConfig } from 'vite'
import handlebars from 'vite-plugin-handlebars'

export default defineConfig({
  server: { host: '0.0.0.0' },
  plugins: [
    handlebars({ partialDirectory: resolve(__dirname, 'partials') })
  ]
})