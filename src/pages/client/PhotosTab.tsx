import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, stamp, type Client, type Photo, type PhotoAngle } from '../../db'
import { BlobImg } from '../../components/media'
import { Button, Card, Empty, Field, Section, Segmented, Sheet, TextArea, confirmAsk, cx, toast } from '../../components/ui'
import { IconCamera, IconSwap } from '../../components/icons'
import { compressImage } from '../../lib/image'
import { ANGLE_LABEL, fmtDate, fmtDateLong, plural, todayISO } from '../../lib/format'

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'front', label: 'Спереди' },
  { value: 'side', label: 'Сбоку' },
  { value: 'back', label: 'Сзади' },
  { value: 'other', label: 'Другое' },
]

const daysBetween = (a: string, b: string) => Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000)

export default function PhotosTab({ client }: { client: Client }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const photos = useLiveQuery(
    async () => (await db.photos.where('clientId').equals(client.id).toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [client.id],
  )
  const [pending, setPending] = useState<File[] | null>(null)
  const [meta, setMeta] = useState({ date: todayISO(), angle: 'front' as PhotoAngle, comment: '' })
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<Photo | null>(null)
  const [compare, setCompare] = useState(false)

  const groups = useMemo(() => {
    const g: { date: string; items: Photo[] }[] = []
    for (const p of photos ?? []) {
      const last = g[g.length - 1]
      if (last && last.date === p.date) last.items.push(p)
      else g.push({ date: p.date, items: [p] })
    }
    return g
  }, [photos])

  if (!photos) return null

  const savePending = async () => {
    if (!pending) return
    setSaving(true)
    try {
      for (const f of pending) {
        const blob = await compressImage(f, 1600, 0.8)
        const thumb = await compressImage(f, 400, 0.75)
        await db.photos.add({ ...stamp(), clientId: client.id, date: meta.date, angle: meta.angle, comment: meta.comment, blob, thumb })
      }
      toast(pending.length > 1 ? `Добавлено ${pending.length} фото` : 'Фото добавлено')
      setPending(null)
    } catch (e) {
      toast('Не получилось сохранить фото: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="primary" size="lg" onClick={() => fileRef.current?.click()}>
          <IconCamera size={20} /> Добавить
        </Button>
        <Button size="lg" onClick={() => setCompare(true)} disabled={photos.length < 2}>
          <IconSwap size={20} /> До / после
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) {
            setMeta({ date: todayISO(), angle: 'front', comment: '' })
            setPending(files)
          }
        }}
      />

      {photos.length === 0 ? (
        <Empty title="Фото пока нет" text="Добавляй фото спереди, сбоку и сзади — потом сравнишь «до» и «после» рядом." />
      ) : (
        groups.map((g) => (
          <Section key={g.date} title={fmtDateLong(g.date)}>
            <div className="grid grid-cols-3 gap-1.5">
              {g.items.map((p) => (
                <button key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-2" onClick={() => setView(p)}>
                  <BlobImg blob={p.thumb} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {ANGLE_LABEL[p.angle]}
                  </span>
                  {p.comment && <span className="absolute right-1 top-1 rounded-md bg-black/55 px-1 text-[11px] text-white">💬</span>}
                </button>
              ))}
            </div>
          </Section>
        ))
      )}

      {/* Новые фото */}
      <Sheet
        open={!!pending}
        onClose={() => !saving && setPending(null)}
        title={pending && pending.length > 1 ? `${pending.length} фото` : 'Новое фото'}
        footer={
          <Button variant="primary" size="lg" block onClick={savePending} disabled={saving}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </Button>
        }
      >
        {pending && (
          <div className="space-y-3">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {pending.map((f, i) => (
                <BlobImg key={i} blob={f} className="h-36 w-28 shrink-0 rounded-xl object-cover" />
              ))}
            </div>
            <Field label="Дата" type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
            <div>
              <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">Ракурс</div>
              <Segmented value={meta.angle} onChange={(v) => setMeta({ ...meta, angle: v })} options={ANGLES} />
            </div>
            <TextArea label="Комментарий" minRows={1} value={meta.comment} onChange={(e) => setMeta({ ...meta, comment: e.target.value })} />
          </div>
        )}
      </Sheet>

      {/* Просмотр фото */}
      <PhotoViewer photo={view} client={client} onClose={() => setView(null)} />

      {/* Сравнение */}
      <CompareSheet open={compare} onClose={() => setCompare(false)} photos={photos} />
    </div>
  )
}

function PhotoViewer({ photo, client, onClose }: { photo: Photo | null; client: Client; onClose: () => void }) {
  const [comment, setComment] = useState('')
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const [date, setDate] = useState('')
  const [lastId, setLastId] = useState<string | null>(null)
  if (photo && photo.id !== lastId) {
    setLastId(photo.id)
    setComment(photo.comment)
    setAngle(photo.angle)
    setDate(photo.date)
  }
  if (!photo) return null

  const save = async () => {
    await db.photos.update(photo.id, { comment, angle, date, updatedAt: Date.now() })
    toast('Сохранено')
    onClose()
  }

  return (
    <Sheet
      open={!!photo}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirmAsk('Удалить это фото?')) return
              await db.photos.delete(photo.id)
              if (client.avatarPhotoId === photo.id) await db.clients.update(client.id, { avatarPhotoId: null })
              toast('Фото удалено')
              onClose()
            }}
          >
            Удалить
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={save}>
            Сохранить
          </Button>
        </div>
      }
    >
      <BlobImg blob={photo.blob} className="max-h-[55dvh] w-full rounded-2xl object-contain" />
      <div className="mt-3 space-y-3">
        <Field label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Segmented value={angle} onChange={setAngle} options={ANGLES} />
        <TextArea label="Комментарий" minRows={1} value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button
          variant="ghost"
          block
          onClick={async () => {
            await db.clients.update(client.id, { avatarPhotoId: photo.id, updatedAt: Date.now() })
            toast('Теперь это аватарка клиента')
          }}
        >
          {client.avatarPhotoId === photo.id ? 'Это аватарка клиента ✓' : 'Сделать аватаркой'}
        </Button>
      </div>
    </Sheet>
  )
}

function CompareSheet({ open, onClose, photos }: { open: boolean; onClose: () => void; photos: Photo[] }) {
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const ofAngle = photos.filter((p) => p.angle === angle)
  const dates = [...new Set(ofAngle.map((p) => p.date))].sort()
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const dateA = a && dates.includes(a) ? a : dates[0]
  const dateB = b && dates.includes(b) ? b : dates[dates.length - 1]
  const pa = ofAngle.find((p) => p.date === dateA)
  const pb = ofAngle.find((p) => p.date === dateB)

  const DatePick = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none"
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {fmtDate(d)}
        </option>
      ))}
    </select>
  )

  return (
    <Sheet open={open} onClose={onClose} title="До / после">
      <Segmented value={angle} onChange={setAngle} options={ANGLES} />
      {dates.length < 1 ? (
        <div className="py-10 text-center text-sm text-muted">Нет фото с ракурсом «{ANGLE_LABEL[angle]}»</div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DatePick value={dateA} onChange={setA} />
            <DatePick value={dateB} onChange={setB} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[pa, pb].map((p, i) => (
              <div key={i}>
                <div className={cx('aspect-[3/4] overflow-hidden rounded-xl bg-surface-2')}>
                  {p && <BlobImg blob={p.blob} className="h-full w-full object-cover" />}
                </div>
                <div className="mt-1 text-center text-[13px] font-medium">{i === 0 ? 'До' : 'После'} · {p ? fmtDate(p.date) : '—'}</div>
                {p?.comment && <div className="text-center text-[12px] text-muted">{p.comment}</div>}
              </div>
            ))}
          </div>
          {dateA && dateB && dateA !== dateB && (
            <Card className="mt-3 p-3 text-center text-sm text-muted">
              Между фото {daysBetween(dateA, dateB)} {plural(daysBetween(dateA, dateB), 'день', 'дня', 'дней')}
            </Card>
          )}
        </>
      )}
    </Sheet>
  )
}
