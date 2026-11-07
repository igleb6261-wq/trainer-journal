/**
 * Ошибка iOS 26 в приложениях с экрана «Домой» (прозрачная строка состояния):
 * страница получает высоту экрана МИНУС высота строки состояния, а внизу система
 * рисует свою чёрную полосу (~62 pt), до которой страница дотянуться не может.
 * Отступ под «полоску домой» при этом всё равно приходит — получается двойной запас,
 * и нижняя панель висит слишком высоко.
 *
 * Здесь меряем эту полосу и, если она есть, ставим на <html> класс ios-gap —
 * тогда в CSS лишний нижний отступ убирается.
 */

type Nav = Navigator & { standalone?: boolean }

let probe: HTMLDivElement | null = null

export function safeInsets() {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
    document.body.appendChild(probe)
  }
  const cs = getComputedStyle(probe)
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
}

/** Высота «мёртвой» полосы внизу экрана (0, если её нет) */
export function bottomDeadStrip() {
  if ((navigator as Nav).standalone !== true) return 0
  if (window.innerHeight <= window.innerWidth) return 0
  const full = Math.max(screen.width, screen.height)
  const d = full - window.innerHeight
  const { top } = safeInsets()
  // полоса равна высоте строки состояния — только тогда это та самая ошибка
  return d > 20 && d < 100 && top > 20 && Math.abs(d - top) <= 12 ? d : 0
}

export function watchViewport() {
  const update = () => {
    const gap = bottomDeadStrip()
    const root = document.documentElement
    root.classList.toggle('ios-gap', gap > 0)
    root.style.setProperty('--dead-strip', `${gap}px`)
  }
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', () => setTimeout(update, 400))
}
