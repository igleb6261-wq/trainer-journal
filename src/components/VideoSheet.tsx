import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey } from '../db'
import { videoEmbedUrl, videoOpenUrl } from '../lib/library'
import { Sheet, cx } from './ui'

/** Видео техники упражнения во всплывающей шторке */
export function VideoSheet({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const videos = useExerciseVideos(name)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (open) setI(0)
  }, [open, name])
  const id = videos[i]
  return (
    <Sheet open={open} onClose={onClose} title={name} tall>
      {!id ? (
        <div className="py-10 text-center text-sm text-muted">Для этого упражнения пока нет видео</div>
      ) : (
        <>
          {videos.length > 1 && (
            <div className="mb-2 flex gap-1.5">
              {videos.map((_, k) => (
                <button
                  key={k}
                  onClick={() => setI(k)}
                  className={cx(
                    'rounded-full px-3 py-1.5 text-[13px] font-medium',
                    k === i ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
                  )}
                >
                  Видео {k + 1}
                </button>
              ))}
            </div>
          )}
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
          <a
            href={videoOpenUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-[15px] text-accent-text"
          >
            Открыть видео отдельно
          </a>
        </>
      )}
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
  if (!videos.length) return null
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
          'flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent-text active:opacity-70',
          className,
        )}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6 4l14 8-14 8z" />
        </svg>
        Техника
      </button>
      <VideoSheet name={name} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
