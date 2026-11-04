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
  const mb = (file.size / 1024 / 1024).toFixed(1).replace('.', ',')
  const wrong = (why: string) =>
    new Error(`Не тот файл: «${file.name}», ${mb} МБ (${why}). Нужен «Видео для приложения», около 40 МБ`)
  if (file.size < 1024) throw wrong('файл пустой или не скачан до конца')
  const buf = await file.arrayBuffer()
  // ищем подпись в начале файла (на случай, если перед ней что-то добавилось)
  const head = new Uint8Array(buf, 0, Math.min(4096, buf.byteLength))
  const sig = new TextEncoder().encode(MAGIC)
  let at = -1
  for (let i = 0; i + sig.length <= head.length && at < 0; i++) {
    let ok = true
    for (let j = 0; j < sig.length; j++) if (head[i + j] !== sig[j]) { ok = false; break }
    if (ok) at = i
  }
  if (at < 0) {
    const first = Array.from(head.slice(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join(' ')
    throw wrong(first === '50 4b 03 04' ? 'это zip-архив' : `начало: ${first}`)
  }
  const view = new DataView(buf)
  const hlen = view.getUint32(at + MAGIC.length, true)
  const hstart = at + MAGIC.length + 4
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, hstart, hlen))) as Header
  if (header.format !== 'trainer-journal-videos') throw wrong('неизвестный формат')
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
