import type EventEmitter from 'events'
import type ParseTorrent from 'parse-torrent'
import torrentEngine from 'torrent-stream'

const BITTORRENT_PORT = Number(process.env.BITTORRENT_PORT) || 6881
export type TorrentInfo = { infoHash: string; name: string; addDate: number }
export type TorrentRuntime = {
  torrent: ParseTorrent.Instance
  amInterested: boolean
  selection: { from: number; to: number }[]
  bitfield: {
    buffer: Buffer
  }
}
type TorrentEventMap = {
  ready: []
  torrent: []
  idle: []
  uninterested: []
  interested: []
  finished: []
  destroyed: []
  download: []
  upload: []
}
export type TorrentEngine = TorrentStream.TorrentEngine &
  EventEmitter<TorrentEventMap> &
  TorrentInfo &
  Partial<TorrentRuntime>

export function createEngine(torrent: TorrentInfo, options?: TorrentStream.TorrentEngineOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine = torrentEngine(torrent as any, options) as TorrentEngine

  engine.name = torrent.name
  engine.addDate = torrent.addDate

  engine.on('ready', () => {
    console.log(`[engine.ts] ready ${engine.infoHash} with files: `)
    engine.files.forEach((file, i) => {
      console.log(`\t ${i}. ${file.name}`)
    })
    console.log('')
  })

  engine.once('ready', () => {
    const biggestFile = engine.files.reduce((a, b) => (a.length > b.length ? a : b))
    biggestFile.select()
  })

  engine.on('uninterested', () => {
    console.log('[engine.ts] uninterested ' + engine.infoHash)
  })

  engine.on('interested', () => {
    console.log('[engine.ts] interested ' + engine.infoHash)
  })

  engine.on('idle', () => {
    engine.emit('finished')
    console.log(`[engine.ts] finished downloading ${engine.infoHash}`)
  })

  engine.once('destroyed', () => {
    console.log('[engine.ts] destroyed ' + engine.infoHash)
    engine.removeAllListeners()
  })

  engine.on('error', (err: string) => {
    console.error('[engine.ts] ERROR ' + engine.infoHash + ': \n' + err)
  })

  engine.listen(BITTORRENT_PORT, () => {
    console.log('[engine.ts] listening ' + engine.infoHash + ' on BT port ' + BITTORRENT_PORT)
  })

  return engine
}
