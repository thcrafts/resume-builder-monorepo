import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createLogger,
  defineConfig,
  loadEnv,
  type Logger,
  type ProxyOptions,
} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/shared/src',
)

const BENIGN_PROXY_NOISE =
  /ECONNABORTED|ECONNRESET|ECONNREFUSED|EPIPE|socket hang up/i

/**
 * Cursor often steals 127.0.0.1:3001, so loopback never reaches Nest.
 * Prefer a LAN IPv4 that actually accepts TCP on the Nest port.
 */
function lanIpv4Candidates(): string[] {
  const preferred: string[] = []
  const fallback: string[] = []

  for (const nets of Object.values(os.networkInterfaces())) {
    for (const netInfo of nets ?? []) {
      const family = String(netInfo.family)
      if ((family !== 'IPv4' && family !== '4') || netInfo.internal) continue
      if (
        netInfo.address.startsWith('192.168.') ||
        netInfo.address.startsWith('10.')
      ) {
        preferred.push(netInfo.address)
      } else {
        fallback.push(netInfo.address)
      }
    }
  }

  return [...preferred, ...fallback]
}

function canConnect(host: string, port: number, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok: boolean) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function resolveNestProxyTarget(port: string): Promise<string> {
  const fromEnv = process.env.VITE_PROXY_TARGET || process.env.NEST_PROXY_TARGET
  if (fromEnv) return fromEnv

  const portNum = Number(port) || 3001
  for (const host of lanIpv4Candidates()) {
    if (await canConnect(host, portNum)) {
      return `http://${host}:${port}`
    }
  }

  const lan = lanIpv4Candidates()[0]
  if (lan) return `http://${lan}:${port}`
  // Last resort only — Cursor often owns this and returns 404.
  return `http://127.0.0.1:${port}`
}

/** Drop Vite's noisy proxy stacks when the browser aborts mid-response. */
function createQuietProxyLogger(): Logger {
  const logger = createLogger()
  const originalError = logger.error.bind(logger)

  logger.error = (msg, options) => {
    const text = typeof msg === 'string' ? msg : String(msg)
    if (
      (text.includes('proxy error') || text.includes('proxy socket error')) &&
      BENIGN_PROXY_NOISE.test(text)
    ) {
      return
    }
    originalError(msg, options)
  }

  return logger
}

function buildProxyOptions(targetRef: { value: string }): ProxyOptions {
  return {
    // Use a live getter — never hardcode 127.0.0.1 (Cursor steals it → 404).
    get target() {
      return targetRef.value
    },
    changeOrigin: true,
    secure: false,
    timeout: 120_000,
    proxyTimeout: 120_000,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        const message = err instanceof Error ? err.message : String(err)
        if (BENIGN_PROXY_NOISE.test(message)) {
          const response = res as {
            writeHead?: (code: number, headers: Record<string, string>) => void
            end?: (body: string) => void
            headersSent?: boolean
            writableEnded?: boolean
          }
          if (
            response?.writeHead &&
            !response.headersSent &&
            !response.writableEnded
          ) {
            response.writeHead?.(502, { 'Content-Type': 'application/json' })
            response.end?.(
              JSON.stringify({
                message:
                  'Backend unavailable — Nest may still be starting. Retry shortly.',
              }),
            )
          }
          return
        }
        console.error('[vite] proxy error:', message)
      })

      proxy.on('proxyReq', (proxyReq, _req, res) => {
        res.on('close', () => {
          if (!res.writableEnded) {
            proxyReq.destroy()
          }
        })
      })

      proxy.on('proxyReqWs', (proxyReq, _req, socket) => {
        socket.on('close', () => {
          proxyReq.destroy()
        })
        socket.on('error', () => {
          proxyReq.destroy()
        })
      })
    },
  }
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.VITE_BACKEND_PORT || '3001'
  const targetRef = { value: await resolveNestProxyTarget(port) }

  console.log(`[vite] proxying /api and /socket.io -> ${targetRef.value}`)

  const refreshTimer = setInterval(() => {
    void resolveNestProxyTarget(port).then((next) => {
      if (next !== targetRef.value) {
        targetRef.value = next
        console.log(`[vite] proxy target refreshed -> ${next}`)
      }
    })
  }, 15_000)
  refreshTimer.unref?.()

  const apiProxy = buildProxyOptions(targetRef)
  const socketProxy = buildProxyOptions(targetRef)
  socketProxy.ws = true

  return {
    customLogger: createQuietProxyLogger(),
    plugins: [react(), tailwindcss()],
    resolve: {
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
      alias: {
        '@resume-builder/shared': path.resolve(sharedRoot, 'index.ts'),
        '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
      },
    },
    server: {
      fs: {
        allow: [
          path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
        ],
      },
      proxy: {
        '/api': apiProxy,
        '/socket.io': socketProxy,
      },
    },
  }
})
