import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'pdf-parse': path.resolve(__dirname, '__mocks__/pdf-parse.js'),
    },
  },
})
