import type { Server } from 'https'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { inspectRoutes, showRoutes } from 'hono/dev'
import { WebSocketServer } from 'ws'
import webSocketHandler from './socket'
import torrentRouter from './torrent.routes'

const app = new Hono()

app
  .use(cors())
  .get('/', (c) => {
    return c.json(
      inspectRoutes(app)
        .filter(r => !r.isMiddleware)
        .map(r => ({
          method: r.method,
          path: r.path,
        }))
    )
  })
  .route('/torrents', torrentRouter)

const port = Number(process.env.PORT || 3000)
const server = serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Server is running on ${info.address}:${info.port}`)
  }
) as Server

showRoutes(app, {
  colorize: true
})

const wss = new WebSocketServer({ server })
wss.on('connection', webSocketHandler)
