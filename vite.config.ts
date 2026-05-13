import path from 'node:path'
import fs from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_URL ?? '/'
const mapEditorSaveEndpoint = '/api/pixel-knight/map-editor/save'

function readJsonBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 5_000_000) {
        req.destroy(new Error('Request body is too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object')
  }
}

function pixelKnightMapEditorSavePlugin(): Plugin {
  const mapsRoot = path.resolve(__dirname, 'src/game-center/pixel-knight/maps')

  return {
    name: 'pixel-knight-map-editor-save',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (req.method !== 'POST' || pathname !== mapEditorSaveEndpoint) {
          next()
          return
        }

        try {
          const body = await readJsonBody(req)
          assertPlainObject(body)

          const slug = body.slug
          if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
            sendJson(res, 400, { ok: false, error: 'Invalid map slug' })
            return
          }

          const mapMeta = body.mapMeta
          const placements = body.placements
          const obstacles = body.obstacles
          assertPlainObject(mapMeta)
          assertPlainObject(placements)
          assertPlainObject(obstacles)

          const mapDir = path.resolve(mapsRoot, slug)
          if (!mapDir.startsWith(`${mapsRoot}${path.sep}`)) {
            sendJson(res, 400, { ok: false, error: 'Invalid map path' })
            return
          }

          await fs.access(path.join(mapDir, 'backdrop.png'))
          await Promise.all([
            fs.writeFile(path.join(mapDir, 'map.meta.json'), `${JSON.stringify(mapMeta, null, 2)}\n`),
            fs.writeFile(path.join(mapDir, 'placements.v1.json'), `${JSON.stringify(placements, null, 2)}\n`),
            fs.writeFile(path.join(mapDir, 'obstacles16.v1.json'), `${JSON.stringify(obstacles, null, 2)}\n`),
          ])

          sendJson(res, 200, { ok: true, files: ['map.meta.json', 'placements.v1.json', 'obstacles16.v1.json'] })
          server.ws.send({
            type: 'custom',
            event: 'pixel-knight-map-editor:saved',
            data: { slug },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown save error'
          sendJson(res, 500, { ok: false, error: message })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [pixelKnightMapEditorSavePlugin(), tailwindcss(), react()],
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
})
