import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type PhotoAngle } from '../db'
import { cx } from './ui'
import { IconRefresh, IconX } from './icons'

/**
 * Простая камера для фото прогресса: чистый кадр без рамок и сеток,
 * таймер и смена камеры. Ракурс выбирается при сохранении фото.
 */
export function GhostCamera({
  onClose,
  onShot,
  onFallback,
}: {
  onClose: () => void
  onShot: (file: File, angle: PhotoAngle) => void
  onFallback: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [timer, setTimer] = useState<0 | 3 | 10>(0)
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

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
        if (b) onShot(new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'front')
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
      {/* верх: закрыть */}
      <div className="flex items-center px-3 pb-2" style={{ paddingTop: 'calc(var(--top-inset) + 8px)' }}>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15" onClick={onClose} aria-label="Закрыть">
          <IconX size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          className={cx('absolute inset-0 h-full w-full object-cover', facing === 'user' && '-scale-x-100')}
        />
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
      </div>

      {/* низ: таймер, затвор, смена камеры */}
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
        <button
          className="flex h-12 w-14 items-center justify-center rounded-xl bg-white/15"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          aria-label="Сменить камеру"
        >
          <IconRefresh size={22} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
