import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey, stamp } from '../db'
import { videoEmbedUrl, videoOpenUrl } from '../lib/library'
import { builtinTechnique, parseTechnique, techniqueToText } from '../lib/techniqueText'
import { Button, Card, Sheet, TextArea, confirmAsk, cx, toast } from './ui'
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
  let ownN = 0
  const ownTotal = videos.filter(isOwn).length
  const oldTotal = videos.length - ownTotal
  const labels = videos.map((v) =>
    isOwn(v) ? (ownTotal > 1 ? `Моё ${++ownN}` : 'Моё видео') : ownTotal ? (oldTotal > 1 ? `Старое ${++libN}` : 'Старое') : `Видео ${++libN}`,
  )
  const cur = Math.min(i, Math.max(0, videos.length - 1))
  const touch = useRef<number | null>(null)

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
        <div
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null || videos.length < 2) return
            const dx = e.changedTouches[0].clientX - touch.current
            touch.current = null
            if (dx < -50 && cur < videos.length - 1) setI(cur + 1)
            if (dx > 50 && cur > 0) setI(cur - 1)
          }}
        >
          <VideoPlayer id={id} name={name} />
          {videos.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {videos.map((v, k) => (
                <span key={v} className={cx('h-1.5 rounded-full transition-all', k === cur ? 'w-4 bg-accent' : 'w-1.5 bg-line')} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="primary" disabled={busy} onClick={() => cam.current?.click()}>
          <IconCamera size={18} /> {busy ? 'Сохраняю…' : hasOwn ? 'Переснять' : 'Снять своё'}
        </Button>
        <Button disabled={busy} onClick={() => gallery.current?.click()}>
          Из галереи
        </Button>
      </div>

      <TechniqueBlock name={name} />

      {id && isOwn(id) && (
        <Button
          variant="ghost"
          block
          className="mt-3 text-danger"
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
      <div className="mt-3 px-1 text-center text-xs text-muted">
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
      let list = known
      if (!list) {
        const key = exKey(name)
        if (!key) return []
        const e = await db.exercises.where('key').equals(key).first()
        list = e?.videos ?? []
      }
      // твоё видео — первым, старые (из пакета) после него свайпом; в настройках их можно скрыть
      const own = list.filter(isOwn)
      if (!own.length) return list
      const showOld = (await db.settings.get('showOldVideos'))?.value !== false
      return showOld ? [...own, ...list.filter((v) => !isOwn(v))] : own
    }, [name, known]) ?? []
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
  if (local === undefined) return <div className="rounded-2xl bg-black" style={{ height: '50dvh' }} />
  if (url)
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-white" style={{ maxHeight: '50dvh' }}>
        <video key={id} src={url} className="max-h-[50dvh] w-full object-contain" autoPlay loop muted playsInline controls />
      </div>
    )
  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-black" style={{ height: '50dvh' }}>
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Подпись раздела внутри описания техники */
function Label({ children, tone }: { children: ReactNode; tone?: 'up' | 'danger' }) {
  return (
    <div
      className={cx(
        'mb-1 text-[12px] font-semibold uppercase tracking-wide',
        tone === 'up' ? 'text-up' : tone === 'danger' ? 'text-danger' : 'text-muted',
      )}
    >
      {children}
    </div>
  )
}

/** Текстовое описание техники под видео: стандартное из библиотеки или своё */
function TechniqueBlock({ name }: { name: string }) {
  const key = exKey(name)
  const ex = useLiveQuery(async () => (await db.exercises.where('key').equals(key).first()) ?? null, [key])
  const [builtin, setBuiltin] = useState<string | null | undefined>(undefined)
  const [edit, setEdit] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setBuiltin(undefined)
    setEdit(null)
    builtinTechnique(name)
      .then((t) => alive && setBuiltin(t))
      .catch(() => alive && setBuiltin(null))
    return () => {
      alive = false
    }
  }, [name])

  if (ex === undefined || builtin === undefined) return <div className="mt-4 h-28 animate-pulse rounded-xl bg-surface" />

  const own = ex?.technique?.trim() || ''
  const text = own || builtin || ''
  const t = parseTechnique(text)

  const save = async (value: string) => {
    const v = value.trim()
    const same = builtin && v === techniqueToText(parseTechnique(builtin)).trim()
    const technique = v && !same ? v : undefined
    if (ex) await db.exercises.update(ex.id, { technique, updatedAt: Date.now() })
    else if (technique) await db.exercises.add({ ...stamp(), name: name.trim(), key, technique })
    setEdit(null)
    toast(technique ? 'Твоё описание сохранено' : 'Описание сохранено')
  }

  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted">Техника выполнения</div>
        {edit === null && (
          <button className="text-[15px] text-accent-text active:opacity-60" onClick={() => setEdit(text ? techniqueToText(t) : '')}>
            {text ? 'Изменить' : 'Написать'}
          </button>
        )}
      </div>

      {edit !== null ? (
        <Card className="p-3">
          <TextArea minRows={10} value={edit} onChange={(e) => setEdit(e.target.value)} placeholder="Опиши технику своими словами" />
          <div className="mt-1 px-1 text-xs text-muted">
            Шаги нумеруй «1.», «2.»; советы и ошибки — строками с «-» под заголовками «Важно:» и «Частые ошибки:».
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => setEdit(null)}>Отмена</Button>
            <Button variant="primary" onClick={() => save(edit)}>
              Сохранить
            </Button>
          </div>
          {own && builtin && (
            <Button
              variant="ghost"
              block
              className="mt-1"
              onClick={async () => {
                if (!confirmAsk('Вернуть стандартное описание? Твой текст удалится.')) return
                await save('')
              }}
            >
              Вернуть стандартное описание
            </Button>
          )}
        </Card>
      ) : !text ? (
        <Card className="p-4 text-sm text-muted">Описания пока нет. Нажми «Написать», чтобы добавить своё.</Card>
      ) : (
        <Card className="space-y-3.5 p-4 text-[15px] leading-snug">
          {t.muscles && (
            <div>
              <Label>Работают</Label>
              {cap(t.muscles)}
            </div>
          )}
          {t.start && (
            <div>
              <Label>Исходное положение</Label>
              {cap(t.start)}
            </div>
          )}
          {t.steps.length > 0 && (
            <div>
              <Label>Выполнение</Label>
              <ol className="space-y-1.5">
                {t.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-4 shrink-0 font-semibold tabular text-accent-text">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {t.tips.length > 0 && (
            <div>
              <Label tone="up">Важно</Label>
              <ul className="space-y-1.5">
                {t.tips.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-up">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {t.errors.length > 0 && (
            <div>
              <Label tone="danger">Частые ошибки</Label>
              <ul className="space-y-1.5">
                {t.errors.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 text-danger">✕</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {t.breath && (
            <div>
              <Label>Дыхание</Label>
              {t.breath}
            </div>
          )}
          {t.notes.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {own && <div className="text-xs text-muted">Это твоё описание</div>}
        </Card>
      )}
    </div>
  )
}
