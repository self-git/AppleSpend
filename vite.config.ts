import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueMcpNext from '@xiaou66/vite-plugin-vue-mcp-next'

export default defineConfig({
  plugins: [
    vue(),
    vueMcpNext({
      host: '127.0.0.1',
      mcpClients: {
        codex: true,
        serverName: 'vite-mcp-next',
      },
      skill: {
        autoConfig: true,
      },
    }),
  ],
  server: {
    port: 5180,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
