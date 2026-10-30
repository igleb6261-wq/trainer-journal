/** Сжимает фото: длинная сторона до maxSide, JPEG. Учитывает поворот с камеры. */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.8): Promise<Blob> {
  let bitmap: ImageBitmap | HTMLImageElement
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  } catch {
    bitmap = await loadImg(file)
  }
  const w = 'width' in bitmap ? bitmap.width : 0
  const h = 'height' in bitmap ? bitmap.height : 0
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const cw = Math.round(w * scale)
  const ch = Math.round(h * scale)
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, cw, ch)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать фото'))), 'image/jpeg', quality),
  )
}

function loadImg(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export const blobToDataURL = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

export const dataURLToBlob = async (d: string): Promise<Blob> => {
  const [head, body] = d.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
