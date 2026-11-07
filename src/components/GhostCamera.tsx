import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PhotoAngle } from '../db'
import { useBlobUrl } from './media'
import { cx } from './ui'
import { IconRefresh, IconX } from './icons'

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'front', label: 'Спереди' },
  { value: 'side', label: 'Сбоку' },
  { value: 'back', label: 'Сзади' },
]

/**
 * Камера с «рамкой»: поверх изображения полупрозрачно показано прошлое фото
 * того же ракурса — клиент встаёт в ту же позу, и фото до/после совпадают.
 */
export function GhostCamera({
  clientId,
  onClose,
  onShot,
  onFallback,
}: {
  clientId: string
  onClose: () => void
  onShot: (file: File, angle: PhotoAngle) => void
  onFallback: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [angle, setAngle] = useState<PhotoAngle>('front')
  const [ghostOn, setGhostOn] = useState(true)
  const [timer, setTimer] = useState<0 | 3 | 10>(0)
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const ghost = useLiveQuery(async () => {
    const list = await db.photos.where('clientId').equals(clientId).toArray()
    const same = list.filter((p) => p.angle === angle).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    return same[0] ?? null
  }, [clientId, angle])
  const ghostUrl = useBlobUrl(ghostOn ? ghost?.blob : null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    setReady(false)
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) return
        if (video.current) {
          video.current.srcObject = stream
          await video.current.play().catch(() => {})
          setReady(true)
        }
      } catch {
        if (!cancelled) setError('Не получилось включить камеру. Разреши доступ к камере или сними обычной камерой.')
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const g = c.getContext('2d')!
    if (facing === 'user') {
      g.translate(c.width, 0)
      g.scale(-1, 1)
    }
    g.drawImage(v, 0, 0)
    c.toBlob(
      (b) => {
        if (b) onShot(new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }), angle)
      },
      'image/jpeg',
      0.92,
    )
  }

  const startShot = () => {
    if (!timer) return shoot()
    let n = timer
    setCount(n)
    const t = window.setInterval(() => {
      n -= 1
      if (n <= 0) {
        window.clearInterval(t)
        setCount(null)
        shoot()
      } else setCount(n)
    }, 1000)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      {/* верх: закрыть, ракурс, рамка */}
      <div className="flex items-center gap-2 px-3 pb-2" style={{ paddingTop: 'calc(var(--top-inset) + 8px)' }}>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15" onClick={onClose} aria-label="Закрыть">
          <IconX size={22} />
        </button>
        <div className="flex flex-1 justify-center gap-1 rounded-full bg-white/15 p-1">
          {ANGLES.map((a) => (
            <button
              key={a.value}
              onClick={() => setAngle(a.value)}
              className={cx('flex-1 rounded-full px-2 py-1.5 text-[13px] font-medium', angle === a.value ? 'bg-white text-black' : 'text-white/80')}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          className={cx('absolute inset-0 h-full w-full object-cover', facing === 'user' && '-scale-x-100')}
        />
        {ghostUrl && ready && <img src={ghostUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35" />}
        {/* направляющие: вертикаль по центру и линии на уровне плеч и таза */}
        {ready && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
            <div className="absolute inset-x-0 top-1/4 h-px bg-white/20" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
          </div>
        )}
        {count !== null && (
          <div className="absolute inset-0 flex items-center justify-center text-[96px] font-bold text-white drop-shadow-lg">{count}</div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="text-[15px]">{error}</div>
            <button className="rounded-2xl bg-white px-5 py-3 font-semibold text-black" onClick={onFallback}>
              Снять обычной камерой
            </button>
          </div>
        )}
        {ready && (
          <div className="absolute inset-x-0 bottom-2 text-center text-[12px] text-white/80">
            {ghost ? (ghostOn ? `Рамка: прошлое фото «${ANGLES.find((a) => a.value === angle)?.label}» от ${ghost.date.split('-').reverse().join('.')}` : 'Рамка выключена') : 'Прошлых фото этого ракурса нет — встань по линиям'}
          </div>
        )}
      </div>

      {/* низ: таймер, затвор, рамка, смена камеры */}
      <div className="flex items-center justify-around px-4 pt-4" style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}>
        <button
          className="flex h-12 w-14 flex-col items-center justify-center rounded-xl bg-white/15 text-[12px] font-semibold"
          onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))}
        >
          <span>⏱</span>
          {timer ? `${timer} с` : 'выкл'}
        </button>
        <button
          aria-label="Сделать фото"
          disabled={!ready || count !== null}
          onClick={startShot}
          className="h-[72px] w-[72px] rounded-full border-4 border-white bg-white/90 active:scale-95 disabled:opacity-40"
        />
        <div className="flex gap-2">
          <button
            className={cx('flex h-12 w-12 items-center justify-center rounded-xl text-[11px] font-semibold', ghostOn ? 'bg-white text-black' : 'bg-white/15')}
            onClick={() => setGhostOn((x) => !x)}
            aria-label="Рамка"
          >
            Рамка
          </button>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="Сменить камеру"
          >
            <IconRefresh size={22} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
