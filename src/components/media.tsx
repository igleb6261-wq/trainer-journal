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
  return (
    <div
      style={{ ...style, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-text"
    >
      {initials(client)}
    </div>
  )
}
