import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import store from './lib/store'
import getStats from './lib/utils/getStats'
import { serializeTorrent } from './lib/utils/serializeTorrents'

function getTorrent(infoHash: string) {
  const torrent = store.get(infoHash)
  if (!torrent) {
    throw new HTTPException(404, { message: 'Torrent not found' })
  }

  return torrent
}

const router = new Hono()
  .get('/', (c) => {
    const data = store.list().map((t) => serializeTorrent(t))
    return c.json(data)
  })
  .post('/', async (c) => {
    const { magnet } = await c.req.json()
    if (!magnet) {
      throw new HTTPException(400, { message: 'Magnet link is required in body' })
    }

    const infoHash = await store.loadTorrent(magnet)
    const data = serializeTorrent(store.get(infoHash))
    return c.json(data)
  })
  .get('/:infoHash', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    return c.json(serializeTorrent(torrent))
  })
  .delete('/:infoHash', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    store.remove(torrent.infoHash)
    return c.json({ message: `delete torrent with hash ${c.req.param('infoHash')}` })
  })
  .get('/:infoHash/stats', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    return c.json(getStats(torrent))
  })
  .post('/:infoHash/pause', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(torrent.swarm as any).pause()
    return c.json({ message: 'Torrent paused' })
  })
  .post('/:infoHash/resume', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(torrent.swarm as any).resume()
    return c.json({ message: 'Torrent resumed' })
  })
  .post('/:infoHash/select', async (c) => {
    const { indexes } = await c.req.json()
    const torrent = getTorrent(c.req.param('infoHash'))
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        torrent.files[index].select()
      })
    }
    return c.json({ message: 'Files selected' })
  })
  .post('/:infoHash/deselect', async (c) => {
    const { indexes } = await c.req.json()
    const torrent = getTorrent(c.req.param('infoHash'))
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        torrent.files[index].deselect()
      })
    }
    return c.json({ message: 'Files deselected' })
  })
  .get('/:infoHash/files/:path{[^"]+}', (c) => {
    const torrent = getTorrent(c.req.param('infoHash'))
    const file = torrent.files.find((f) => f.path === c.req.param('path'))
    if (!file) {
      throw new HTTPException(404, { message: 'File not found' })
    }

    const range = c.req.header('Range')
    if (!range) {
      c.header('Content-Length', String(file.length))
      const fileStream = file.createReadStream() as ReadableStream
      return c.newResponse(fileStream)
    }

    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
    const chunksize = end - start + 1

    c.header('Content-Range', `bytes ${start}-${end}/${file.length}`)
    c.header('Accept-Ranges', 'bytes')
    c.header('Content-Length', String(chunksize))
    c.status(206)

    const fileStream = file.createReadStream({ start, end }) as ReadableStream
    return c.newResponse(fileStream)
  })

export default router
