import os from 'node:os'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Cursor (and some WSL relays) often bind 127.0.0.1:3001, so
 * localhost/127.0.0.1 never reach Nest listening on 0.0.0.0:3001.
 * Prefer a non-loopback IPv4 so the Vite proxy hits Nest.
 */
function nestProxyTarget(port: string): string {
  const fromEnv = process.env.VITE_PROXY_TARGET || process.env.NEST_PROXY_TARGET
  if (fromEnv) return fromEnv

  const preferred: string[] = []
  const fallback: string[] = []

  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      const family = String(net.family)
      if ((family !== 'IPv4' && family !== '4') || net.internal) continue
      if (
        net.address.startsWith('192.168.') ||
        net.address.startsWith('10.')
      ) {
        preferred.push(net.address)
      } else {
        fallback.push(net.address)
      }
    }
  }

  const host = preferred[0] ?? fallback[0]
  if (host) return `http://${host}:${port}`

  return `http://127.0.0.1:${port}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.VITE_BACKEND_PORT || '3001'
  const target = nestProxyTarget(port)

  console.log(`[vite] proxying /api and /socket.io -> ${target}`)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
