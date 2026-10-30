import { registerSW } from 'virtual:pwa-register'

/* ============================================================
   Автообновление приложения на экране «Домой».
   Телефон держит приложение «спящим» и сам редко проверяет
   новую версию, поэтому проверяем сами:
   - при запуске,
   - каждый раз, когда приложение снова открывают (из фона),
   - раз в час, если оно открыто.
   Как только новая версия скачалась — страница перезагружается.
   ============================================================ */

let registration: ServiceWorkerRegistration | undefined
let updateSW: ((reload?: boolean) => Promise<void>) | undefined

export function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // новая версия готова — применяем сразу
      updateSW?.(true)
    },
    onRegisteredSW(_url, r) {
      registration = r
      if (!r) return
      setInterval(() => r.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration?.update().catch(() => {})
  })

  // когда новый service worker взял управление — перезагружаемся на свежую версию
  // (при самой первой установке перезагрузка не нужна)
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return
    reloaded = true
    window.location.reload()
  })
}

/** Ручная проверка из настроек. Возвращает true, если нашлась новая версия. */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return false
  await registration.update()
  const r = registration
  return !!(r.installing || r.waiting)
}

/** Принудительная перезагрузка со сбросом кэша приложения (данные клиентов не трогаем) */
export async function hardReload() {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    const regs = await navigator.serviceWorker?.getRegistrations()
    await Promise.all((regs ?? []).map((r) => r.unregister()))
  } catch {
    /* ignore */
  }
  window.location.reload()
}
