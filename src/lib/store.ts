import { EventEmitter } from 'events'
import fs from 'fs/promises'
import path from 'path'
import parseTorrent from 'parse-torrent'
import type { TorrentEngine } from './engine';
import { type TorrentInfo, createEngine } from './engine'

const storagePath = process.env.STORAGE_PATH || '/tmp'

class Store extends EventEmitter<{ torrent: [TorrentEngine]; destroyed: [] }> {
  storageFilePath: string
  torrents: Record<string, TorrentEngine>

  constructor({ storageFilePath }: { storageFilePath: string }) {
    super()
    this.storageFilePath = storageFilePath
    this.torrents = {}
  }

  async loadTorrent(magnet: string) {
    const torrent = await parseTorrent(magnet)
    console.log('[store.ts] parsed magnet: \n', torrent)
    const infoHash = torrent.infoHash
    const name = String(torrent.name || torrent.dn || '')
    const addDate = Date.now()

    if (!infoHash) {
      throw new Error('Invalid magnet URI')
    }

    if (this.torrents[infoHash]) {
      return infoHash
    }

    console.log(`[store.ts] adding ${name} with hash ${infoHash}`)

    this.addTorrent({
      infoHash,
      name,
      addDate
    })

    await this.writeStorage()
    return infoHash
  }

  addTorrent(torrent: TorrentInfo) {
    const engine = createEngine(torrent)
    this.emit('torrent', engine)
    this.torrents[torrent.infoHash] = engine
  }

  get(infoHash: string) {
    return this.torrents[infoHash]
  }

  async remove(infoHash: string) {
    const torrent = this.torrents[infoHash]
    if (!torrent) {
      return
    }

    torrent.destroy(() => {})
    torrent.remove(false, () => {
      torrent.emit('destroyed')
    })

    delete this.torrents[infoHash]
    await this.writeStorage()
  }

  list() {
    return Object.values(this.torrents)
  }

  async init() {
    try {
      const torrents = await this.readStorage()
      console.log('[store.ts] resuming from previous state')
      torrents.forEach((torrent) => {
        this.addTorrent(torrent)
      })
    } catch (err) {
      if ((err as { code: string }).code === 'ENOENT') {
        console.log('[store.ts] previous state not found')
      } else {
        console.error(`[store.ts] error reading storage ${err}`)
        throw err
      }
    }
  }

  clean(signal: string) {
    if (signal) {
      console.log(`\n[store.ts] Received signal ${signal}. Cleaning torrent store`)
    }
    Object.keys(this.torrents).forEach((key) => {
      const torrent = this.torrents[key]
      torrent.destroy(() => {
        torrent.emit('destroyed')
        delete this.torrents[key]
      })
    })
    process.nextTick(process.exit)
  }

  async readStorage() {
    const text = await fs.readFile(this.storageFilePath, 'utf-8')
    return JSON.parse(text) as TorrentInfo[]
  }

  async writeStorage() {
    const torrents = Object.values(this.torrents).map((torrent) => ({
      infoHash: torrent.infoHash,
      name: torrent.name,
      addDate: torrent.addDate
    }))
    const text = JSON.stringify(torrents)
    await fs.writeFile(this.storageFilePath, text)

    console.log('[store.ts] state saved')
  }
}

const storageFilePath = path.join(storagePath, 'torrentlist.json')
const store = new Store({ storageFilePath })

store.init()

process.on('SIGINT', () => store.clean('SIGINT'))
process.on('SIGTERM', () => store.clean('SIGTERM'))

export default store
