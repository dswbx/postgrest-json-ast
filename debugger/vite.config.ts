import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/postgrest-json-ast/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'postgrest-ast': path.resolve(__dirname, '../src/index.ts'),
    },
  },
})
