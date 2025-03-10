import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [],
    server: {
      host: '0.0.0.0',
      port: 3002,
    },
  }
})
