import type { TorrentEngine } from '../engine'

// TODO add types
export default function getStats(torrent: TorrentEngine) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swarm = torrent.swarm as any
  return {
    totalPeers: swarm.wires.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activePeers: swarm.wires.reduce((acum: number, wire: any) => acum + Number(!wire.peerChoking), 0),
    downloaded: swarm.downloaded,
    uploaded: swarm.uploaded,
    downloadSpeed: swarm.downloadSpeed(),
    uploadSpeed: swarm.uploadSpeed(),
    queuedPeers: swarm.queued,
    paused: swarm.paused
  }
}
