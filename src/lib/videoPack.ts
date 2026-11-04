import { db, exKey, stamp, type ExerciseRef } from '../db'

/* ============================================================
   Загрузка пакета видео техники (.tjvideos) в память телефона.
   Формат: "TJVID1\n" + длина заголовка (uint32 LE) + JSON-заголовок
   + подряд записанные mp4-файлы.
   Видео хранятся только на этом устройстве и не попадают на сайт.
   ============================================================ */

type Header = {
  format: string
  version: number
  exercises: [name: string, group: string, ids: string[]][]
  files: [id: string, offset: number, length: number][]
}

const MAGIC = 'TJVID1\n'

export async function importVideoPack(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ videos: number; exercises: number }> {
  const buf = await file.arrayBuffer()
  const magic = new TextDecoder().decode(new Uint8Array(buf, 0, MAGIC.length))
  if (magic !== MAGIC) throw new Error('Это не файл с видео упражнений')
  const view = new DataView(buf)
  const hlen = view.getUint32(MAGIC.length, true)
  const hstart = MAGIC.length + 4
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, hstart, hlen))) as Header
  if (header.format !== 'trainer-journal-videos') throw new Error('Это не файл с видео упражнений')
  const base = hstart + hlen

  // 1) видео — пачками, чтобы не держать всё сразу
  const total = header.files.length
  for (let i = 0; i < total; i += 20) {
    const chunk = header.files.slice(i, i + 20).map(([id, off, len]) => ({
      id,
      blob: new Blob([buf.slice(base + off, base + off + len)], { type: 'video/mp4' }),
    }))
    await db.videos.bulkPut(chunk)
    onProgress?.(Math.min(i + 20, total), total)
  }

  // 2) привязка видео к упражнениям библиотеки
  const existing = await db.exercises.toArray()
  const byKey = new Map(existing.map((e) => [e.key, e]))
  const toAdd: ExerciseRef[] = []
  let linked = 0
  for (const [name, group, ids] of header.exercises) {
    if (!ids.length) continue
    const key = exKey(name)
    const ex = byKey.get(key)
    if (ex) {
      const videos = [...new Set([...(ex.videos ?? []), ...ids])]
      await db.exercises.update(ex.id, { videos, group: ex.group || group })
    } else {
      const e: ExerciseRef = { ...stamp(), name, key, group, videos: ids }
      toAdd.push(e)
      byKey.set(key, e)
    }
    linked++
  }
  await db.exercises.bulkAdd(toAdd)
  return { videos: total, exercises: linked }
}

export async function videoStats(): Promise<{ count: number; bytes: number }> {
  let bytes = 0
  let count = 0
  await db.videos.each((v) => {
    count++
    bytes += v.blob.size
  })
  return { count, bytes }
}

export async function clearVideos() {
  await db.videos.clear()
}
