import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconArrowDown, IconArrowUp } from './icons'

/* Панель над клавиатурой: «Готово» и переход к соседнему полю.
   На iPhone у цифровой клавиатуры нет кнопки «Готово» — без неё она
   закрывает нижние кнопки экрана. */

const SKIP = ['date', 'time', 'file', 'checkbox', 'radio', 'button', 'submit', 'range', 'color']

const isField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el &&
  ((el.tagName === 'TEXTAREA' && !(el as HTMLTextAreaElement).readOnly) ||
    (el.tagName === 'INPUT' && !SKIP.includes((el as HTMLInputElement).type) && !(el as HTMLInputElement).readOnly))

const visibleFields = () =>
  Array.from(document.querySelectorAll('input, textarea')).filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement =>
      isField(el) && !(el as HTMLInputElement).disabled && (el as HTMLElement).offsetParent !== null,
  )

export function KeyboardBar() {
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let t: number | undefined
    const update = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        const el = document.activeElement
        const kb = window.innerHeight - vv.height
        if (!isField(el) || kb < 120) setTop(null)
        else setTop(vv.offsetTop + vv.height - 44)
      }, 60)
    }
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  if (top === null) return null

  const move = (d: 1 | -1) => {
    const list = visibleFields()
    const i = list.indexOf(document.activeElement as HTMLInputElement)
    const next = list[i + d]
    if (next) {
      next.focus()
      next.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault()
  const btn = 'flex h-11 w-11 items-center justify-center text-accent-text active:opacity-60'

  return createPortal(
    <div className="fixed inset-x-0 z-[90] flex h-11 items-center border-t border-line bg-bar px-1" style={{ top }}>
      <button className={btn} onPointerDown={keep} onMouseDown={keep} onClick={() => move(-1)} aria-label="Предыдущее поле">
        <IconArrowUp size={20} />
      </button>
      <button className={btn} onPointerDown={keep} onMouseDown={keep} onClick={() => move(1)} aria-label="Следующее поле">
        <IconArrowDown size={20} />
      </button>
      <div className="flex-1" />
      <button
        className="h-11 px-4 text-[16px] font-semibold text-accent-text active:opacity-60"
        onPointerDown={keep}
        onMouseDown={keep}
        onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
      >
        Готово
      </button>
    </div>,
    document.body,
  )
}
