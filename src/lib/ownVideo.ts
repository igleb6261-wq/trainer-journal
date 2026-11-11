import { db, exKey, stamp, uid } from '../db'

/* ============================================================
   Свои видео техники: снимаются на телефон и хранятся только в нём.
   У упражнения одно «моё видео» — оно показывается первым.
   ============================================================ */

export const OWN_PREFIX = 'own-'
export const isOwn = (id: string) => id.startsWith(OWN_PREFIX)
/** Свои видео из зашифрованного пакета на сайте: в резервную копию не входят — их можно скачать заново */
export const OWN_PACK_PREFIX = 'own-pack-'
export const isPackOwn = (id: string) => id.startsWith(OWN_PACK_PREFIX)

/** Сохраняет своё видео к упражнению (заменяет прежнее своё, если было) */
export async function saveOwnVideo(name: string, file: Blob): Promise<void> {
  const key = exKey(name)
  if (!key) throw new Error('У упражнения нет названия')
  const id = OWN_PREFIX + uid()
  await db.transaction('rw', [db.exercises, db.videos], async () => {
    let ex = await db.exercises.where('key').equals(key).first()
    if (!ex) {
      ex = { ...stamp(), name: name.trim(), key }
      await db.exercises.add(ex)
    }
    const old = (ex.videos ?? []).filter(isOwn)
    if (old.length) await db.videos.bulkDelete(old)
    await db.videos.put({ id, blob: file })
    const rest = (ex.videos ?? []).filter((v) => !isOwn(v))
    await db.exercises.update(ex.id, { videos: [id, ...rest], updatedAt: Date.now() })
  })
}

/** Удаляет своё видео; видео из библиотеки остаются */
export async function deleteOwnVideo(name: string, id: string): Promise<void> {
  const key = exKey(name)
  await db.transaction('rw', [db.exercises, db.videos], async () => {
    await db.videos.delete(id)
    const ex = await db.exercises.where('key').equals(key).first()
    if (ex) await db.exercises.update(ex.id, { videos: (ex.videos ?? []).filter((v) => v !== id), updatedAt: Date.now() })
  })
}

export const fmtMb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes > 10 * 1048576 ? 0 : 1).replace('.', ',')} МБ`
