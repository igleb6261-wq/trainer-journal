import { useEffect, useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Client } from '../db'
import { initials } from '../lib/format'
import { cx } from './ui'

/** Создаёт временную ссылку на картинку из базы и чистит её после использования */
export function useBlobUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function BlobImg({
  blob,
  className,
  alt = '',
  style,
}: {
  blob: Blob | null | undefined
  className?: string
  alt?: string
  style?: CSSProperties
}) {
  const url = useBlobUrl(blob)
  if (!url) return <div style={style} className={cx('bg-surface-2', className)} />
  return <img src={url} alt={alt} style={style} className={className} draggable={false} />
}

export function Avatar({ client, size = 44 }: { client: Client; size?: number }) {
  const photo = useLiveQuery(
    () => (client.avatarPhotoId ? db.photos.get(client.avatarPhotoId) : undefined),
    [client.avatarPhotoId],
  )
  const style = { width: size, height: size }
  if (photo) return <BlobImg blob={photo.thumb} style={style} className="shrink-0 rounded-full object-cover" />
  const [a, b] = AVATAR_COLORS[hash(client.id) % AVATAR_COLORS.length]
  return (
    <div
      style={{ ...style, fontSize: size * 0.38, background: `linear-gradient(180deg, ${a}, ${b})` }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {initials(client)}
    </div>
  )
}

/** Цветные аватарки, как в мессенджерах: цвет постоянный для каждого клиента */
const AVATAR_COLORS: [string, string][] = [
  ['#ff885e', '#ff516a'], // красный
  ['#ffcd6a', '#ffa85c'], // оранжевый
  ['#82b1ff', '#665fff'], // фиолетовый
  ['#a0de7e', '#54cb68'], // зелёный
  ['#53edd6', '#28c9b7'], // бирюзовый
  ['#72d5fd', '#2a9ef1'], // голубой
  ['#e0a2f3', '#d669ed'], // розовый
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
