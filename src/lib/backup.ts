import { db, setSetting, type Photo } from '../db'
import { blobToDataURL, dataURLToBlob } from './image'
import { todayISO } from './format'

const FORMAT = 'trainer-journal-backup'
const VERSION = 1

type PhotoJSON = Omit<Photo, 'blob' | 'thumb'> & { blob: string; thumb: string }

/** Собирает все данные (включая фото) в один файл */
export async function exportBackup(): Promise<File> {
  const [clients, programs, workouts, measurements, photos, exercises, settings] = await Promise.all([
    db.clients.toArray(),
    db.programs.toArray(),
    db.workouts.toArray(),
    db.measurements.toArray(),
    db.photos.toArray(),
    db.exercises.toArray(),
    db.settings.toArray(),
  ])
  // свои видео техники (видео из библиотеки в копию не входят — они загружаются отдельно)
  const own = await db.videos.filter((v) => v.id.startsWith('own-')).toArray()
  const ownVideos: { id: string; blob: string }[] = []
  for (const v of own) ownVideos.push({ id: v.id, blob: await blobToDataURL(v.blob) })
  const photosJson: PhotoJSON[] = []
  for (const p of photos) {
    photosJson.push({ ...p, blob: await blobToDataURL(p.blob), thumb: await blobToDataURL(p.thumb) })
  }
  const data = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tables: {
      clients,
      programs,
      workouts,
      measurements,
      photos: photosJson,
      ownVideos,
      exercises,
      settings: settings.filter((s) => s.key !== 'lastBackupAt'),
    },
  }
  const json = JSON.stringify(data)
  return new File([json], `журнал-тренера-${todayISO()}.json`, { type: 'application/json' })
}

/** Отдаёт файл: через меню «Поделиться» (если есть), иначе скачивание */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // иначе — пробуем скачать
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}

export async function markBackupDone() {
  await setSetting('lastBackupAt', Date.now())
}

/** Восстанавливает данные из файла. Текущие данные заменяются. */
export async function importBackup(file: File): Promise<{ clients: number; workouts: number; photos: number }> {
  const text = await file.text()
  let data: { format?: string; tables?: Record<string, unknown[]> }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён или это не резервная копия')
  }
  if (data.format !== FORMAT || !data.tables) throw new Error('Это не резервная копия журнала тренера')
  const t = data.tables as Record<string, never[]>
  const photos: Photo[] = []
  for (const p of (t.photos ?? []) as PhotoJSON[]) {
    photos.push({ ...p, blob: await dataURLToBlob(p.blob), thumb: await dataURLToBlob(p.thumb) })
  }
  await db.transaction(
    'rw',
    [db.clients, db.programs, db.workouts, db.measurements, db.photos, db.exercises, db.settings, db.videos],
    async () => {
      await Promise.all([
        db.clients.clear(),
        db.programs.clear(),
        db.workouts.clear(),
        db.measurements.clear(),
        db.photos.clear(),
        db.exercises.clear(),
        db.settings.clear(),
      ])
      await db.clients.bulkPut(t.clients ?? [])
      await db.programs.bulkPut(t.programs ?? [])
      await db.workouts.bulkPut(t.workouts ?? [])
      await db.measurements.bulkPut(t.measurements ?? [])
      await db.photos.bulkPut(photos)
      await db.exercises.bulkPut(t.exercises ?? [])
      await db.settings.bulkPut(t.settings ?? [])
      await db.videos.bulkDelete((await db.videos.toCollection().primaryKeys()).filter((k) => String(k).startsWith('own-')))
    },
  )
  for (const v of (t.ownVideos ?? []) as { id: string; blob: string }[]) {
    await db.videos.put({ id: v.id, blob: await dataURLToBlob(v.blob) })
  }
  await markBackupDone()
  return {
    clients: (t.clients ?? []).length,
    workouts: (t.workouts ?? []).length,
    photos: photos.length,
  }
}
