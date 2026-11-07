import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey } from '../db'
import { videoEmbedUrl, videoOpenUrl } from '../lib/library'
import { Button, Sheet, confirmAsk, cx, toast } from './ui'
import { IconCamera } from './icons'
import { deleteOwnVideo, fmtMb, isOwn, saveOwnVideo } from '../lib/ownVideo'
import { useBlobUrl } from './media'

/** Видео техники упражнения во всплывающей шторке */
export function VideoSheet({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const videos = useExerciseVideos(name)
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const cam = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) setI(0)
  }, [open, name])
  const id = videos[Math.min(i, Math.max(0, videos.length - 1))]
  const hasOwn = videos.some(isOwn)
  let libN = 0
  const labels = videos.map((v) => (isOwn(v) ? 'Моё видео' : `Видео ${++libN}`))

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (hasOwn && !confirmAsk('Заменить твоё прежнее видео этим?')) return
    setBusy(true)
    try {
      await saveOwnVideo(name, f)
      setI(0)
      toast(`Твоё видео сохранено (${fmtMb(f.size)})`)
    } catch (e) {
      toast('Не удалось сохранить видео: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={name} tall>
      {videos.length > 1 && (
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
          {labels.map((label, k) => (
            <button
              key={videos[k]}
              onClick={() => setI(k)}
              className={cx(
                'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium',
                videos[k] === id ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!id ? (
        <div className="rounded-2xl bg-surface px-6 py-10 text-center">
          <div className="text-[15px] font-semibold">Видео пока нет</div>
          <div className="mt-1 text-sm text-muted">Сними, как ты показываешь технику — видео сохранится в этом упражнении.</div>
        </div>
      ) : (
        <VideoPlayer id={id} name={name} />
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="primary" disabled={busy} onClick={() => cam.current?.click()}>
          <IconCamera size={18} /> {busy ? 'Сохраняю…' : hasOwn ? 'Переснять' : 'Снять своё'}
        </Button>
        <Button disabled={busy} onClick={() => gallery.current?.click()}>
          Из галереи
        </Button>
      </div>
      {id && isOwn(id) && (
        <Button
          variant="ghost"
          block
          className="mt-1 text-danger"
          onClick={async () => {
            if (!confirmAsk('Удалить твоё видео для этого упражнения?')) return
            await deleteOwnVideo(name, id)
            setI(0)
            toast('Видео удалено')
          }}
        >
          Удалить моё видео
        </Button>
      )}
      <div className="mt-2 px-1 text-center text-xs text-muted">
        Свои видео хранятся только в телефоне и попадают в резервную копию. Снимай короткие ролики, 5–15 секунд.
      </div>
      <input
        ref={cam}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          onFile(f)
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          onFile(f)
        }}
      />
    </Sheet>
  )
}

/** Видео упражнения по его названию (из библиотеки) */
export function useExerciseVideos(name: string, known?: string[]): string[] {
  return (
    useLiveQuery(async () => {
      if (known) return known
      const key = exKey(name)
      if (!key) return []
      const e = await db.exercises.where('key').equals(key).first()
      return e?.videos ?? []
    }, [name, known]) ?? known ?? []
  )
}

/** Маленькая кнопка ▶, видна только если у упражнения есть видео */
export function VideoButton({ name, className, videos: known }: { name: string; className?: string; videos?: string[] }) {
  const videos = useExerciseVideos(name, known)
  const [open, setOpen] = useState(false)
  const own = videos.some(isOwn)
  const none = videos.length === 0
  return (
    <>
      <button
        type="button"
        aria-label="Видео техники"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cx(
          'flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold active:opacity-70',
          none ? 'border border-dashed border-line text-muted' : 'bg-accent-soft text-accent-text',
          className,
        )}
      >
        {none ? (
          <>+ Видео</>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 4l14 8-14 8z" />
            </svg>
            {own ? 'Моё видео' : 'Техника'}
          </>
        )}
      </button>
      <VideoSheet name={name} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

/** Видео из памяти телефона; если его там нет — с Google Диска */
function VideoPlayer({ id, name }: { id: string; name: string }) {
  const local = useLiveQuery(async () => (await db.videos.get(id)) ?? null, [id])
  const url = useBlobUrl(local?.blob)
  if (local === undefined) return <div className="rounded-2xl bg-black" style={{ height: '62dvh' }} />
  if (url)
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-white" style={{ maxHeight: '62dvh' }}>
        <video key={id} src={url} className="max-h-[62dvh] w-full object-contain" autoPlay loop muted playsInline controls />
      </div>
    )
  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-black" style={{ height: '62dvh' }}>
        <iframe
          key={id}
          src={videoEmbedUrl(id)}
          title={name}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
      <a href={videoOpenUrl(id)} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[15px] text-accent-text">
        Открыть видео отдельно
      </a>
      <div className="mt-1 text-center text-xs text-muted">Это видео не загружено в телефон и открывается из интернета</div>
    </>
  )
}
