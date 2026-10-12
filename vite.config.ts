import { lookImageApi } from './server/image-api.ts'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const codespaceHost = process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ? `${process.env.CODESPACE_NAME}-5173.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
  : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lookImageApi()],
  server: {
    allowedHosts: codespaceHost ? [codespaceHost] : [],
  },
})
