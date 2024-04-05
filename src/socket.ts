import throttle from 'just-throttle'
import type { WebSocket } from 'ws'
import { type TorrentEngine } from './lib/engine'
import store from './lib/store'
import { type SerializedTorrent, serializeTorrent } from './lib/utils/serializeTorrents'

type IncomingMessage =
  | {
      type: 'pause' | 'resume'
      infoHash: string
    }
  | {
      type: 'select' | 'deselect'
      infoHash: string
      fileIndex: number
    }

type OutgoingMessage =
  | {
      type: 'error'
      message: string
    }
  | {
      type: 'ready' | 'download' | 'upload' | 'interested' | 'uninterested' | 'finished' | 'destroyed'
      torrent: SerializedTorrent
    }

function handleError(ws: WebSocket, error: Error) {
  console.error(error)
  sendMessage(ws, {
    type: 'error',
    message: String(error)
  })
}

function sendMessage(ws: WebSocket, message: OutgoingMessage) {
  ws.send(JSON.stringify(message))
}

export default function webSocketHandler(ws: WebSocket) {
  ws.on('error', handleError)
  ws.on('open', () => {
    console.log('client connected to socket')
  })
  ws.on('close', () => {
    console.log('client disconnected from socket')
  })
  ws.on('message', function message(data: string) {
    try {
      const message = JSON.parse(data) as IncomingMessage
      processMessage(ws, message)
    } catch (error) {
      handleError(ws, error as Error)
    }
  })

  store.on('torrent', (torrent: TorrentEngine) => {
    if (torrent.torrent) {
      trackTorrent(ws, torrent)
    } else {
      torrent.once('ready', () => trackTorrent(ws, torrent))
    }
  })
}

const TORRENT_STATS_INTERVAL = 1000

function trackTorrent(ws: WebSocket, torrent: TorrentEngine) {
  sendMessage(ws, {
    type: 'ready',
    torrent: serializeTorrent(torrent)
  })

  const sendMessageThrottled = throttle((type: Exclude<OutgoingMessage['type'], 'error'>) => {
    sendMessage(ws, {
      type,
      torrent: serializeTorrent(torrent)
    })
  }, TORRENT_STATS_INTERVAL)

  const eventTypes = ['interested', 'uninterested', 'download', 'upload', 'finished', 'destroyed'] as const

  for (const type of eventTypes) {
    torrent.on(type, () => sendMessageThrottled(type))
  }
}

function processMessage(ws: WebSocket, message: IncomingMessage) {
  const torrent = store.get(message.infoHash)
  if (!torrent) {
    handleError(ws, new Error(`Torrent not found for infoHash: ${message.infoHash}`))
    return
  }

  const type = message.type
  switch (type) {
    case 'pause':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(torrent.swarm as any)?.pause()
      break
    case 'resume':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(torrent.swarm as any)?.resume()
      break
    case 'select':
      torrent.files[message.fileIndex]?.select()
      break
    case 'deselect':
      torrent.files[message.fileIndex]?.deselect()
      break
    default:
      handleError(ws, new Error(`Invalid message type: ${type}`))
  }
}
