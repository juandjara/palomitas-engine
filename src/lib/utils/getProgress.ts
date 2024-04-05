export default function getProgress(buffer: Buffer) {
  const progress = []
  let counter = 0
  let downloaded = true

  for (let i = 0; i < buffer.length; i++) {
    const piece = buffer[i]
    if ((downloaded && piece > 0) || (!downloaded && piece === 0)) {
      counter++
    } else {
      progress.push(counter)
      counter = 1
      downloaded = !downloaded
    }
  }

  progress.push(counter)

  return progress.map((p) => (p * 100) / buffer.length)
}
