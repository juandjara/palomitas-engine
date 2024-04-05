import mime from 'mime-types'
import type { TorrentEngine } from '../engine'
import getProgress from './getProgress'
import getStats from './getStats'

export type SerializedTorrent = ReturnType<typeof serializeTorrent>

export function serializeTorrent(torrent: TorrentEngine) {
  if (!torrent.torrent) {
    return {
      ready: false,
      name: torrent.name,
      addDate: torrent.addDate,
      infoHash: torrent.infoHash
    }
  }
  const pieceLength = torrent.torrent.pieceLength!

  return {
    ready: true,
    infoHash: torrent.infoHash,
    name: torrent.torrent.name,
    interested: torrent.amInterested,
    addDate: torrent.addDate,
    stats: getStats(torrent),
    progress: torrent.bitfield ? getProgress(torrent.bitfield.buffer) : [],
    files: torrent.files.map((f) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const offset = (f as any).offset as number
      const start = (offset / pieceLength) | 0
      const end = ((offset + f.length - 1) / pieceLength) | 0
      const link = `/torrents/${torrent.infoHash}/files/${encodeURIComponent(f.path)}`
      return {
        name: f.name,
        mime: mime.lookup(f.name) || 'application/octet-stream',
        path: f.path,
        length: f.length,
        offset: offset,
        link,
        selected: (torrent.selection || []).some((s) => s.from <= start && s.to >= end)
      }
    })
  }
}
