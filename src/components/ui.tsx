import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { IconBack } from './icons'
import { num, parseNum } from '../lib/format'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------------- Шапка экрана ---------------- */

export function TopBar({
  title,
  subtitle,
  back,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean | string
  right?: ReactNode
}) {
  const nav = useNavigate()
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-1 px-2">
        {back ? (
          <button
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-surface-2"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label="Назад"
          >
            <IconBack size={26} />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold leading-tight">{title}</div>
          {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  )
}

export function IconButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={cx(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-surface-2 disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------------- Кнопки ---------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; block?: boolean }) {
  return (
    <button
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-12 px-4 text-[15px]',
        size === 'lg' && 'h-14 px-5 text-base',
        variant === 'primary' && 'bg-accent text-accent-ink',
        variant === 'secondary' && 'bg-surface-2 text-ink',
        variant === 'soft' && 'bg-accent-soft text-accent-text',
        variant === 'ghost' && 'text-accent-text active:bg-surface-2',
        variant === 'danger' && 'bg-danger-soft text-danger',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------------- Карточки и секции ---------------- */

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cx('rounded-2xl border border-line bg-surface', onClick && 'cursor-pointer active:bg-surface-2', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function Section({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5">
      {(title || action) && (
        <div className="mb-2 flex items-end justify-between px-1">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="text-base font-semibold">{title}</div>
      {text && <div className="mt-1 max-w-xs text-sm text-muted">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Row({
  label,
  value,
  onClick,
  right,
}: {
  label: ReactNode
  value?: ReactNode
  onClick?: () => void
  right?: ReactNode
}) {
  return (
    <div
      className={cx(
        'flex min-h-12 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0',
        onClick && 'cursor-pointer active:bg-surface-2',
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1 text-[15px]">{label}</div>
      {value !== undefined && <div className="text-right text-[15px] text-muted">{value}</div>}
      {right}
    </div>
  )
}

/* ---------------- Поля ввода ---------------- */

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">{children}</div>
}

const inputCls =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[16px] text-ink outline-none placeholder:text-muted/60 focus:border-accent-text'

export function Field({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cx('block', className)}>
      {label && <Label>{label}</Label>}
      <input className={inputCls} {...rest} />
    </label>
  )
}

/** Многострочное поле, растёт по мере ввода */
export function TextArea({
  label,
  className,
  value,
  minRows = 2,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [value])
  return (
    <label className={cx('block', className)}>
      {label && <Label>{label}</Label>}
      <textarea ref={ref} rows={minRows} value={value} className={cx(inputCls, 'resize-none')} {...rest} />
    </label>
  )
}

/** Числовое поле: цифровая клавиатура, запятая или точка */
export function NumField({
  value,
  onChange,
  label,
  placeholder,
  className,
  inputClassName,
  suffix,
  integer,
}: {
  value: number | null
  onChange: (v: number | null) => void
  label?: ReactNode
  placeholder?: string
  className?: string
  inputClassName?: string
  suffix?: string
  integer?: boolean
}) {
  const [text, setText] = useState(value === null ? '' : num(value, 3))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : num(value, 3))
  }, [value])
  return (
    <label className={cx('block', className)}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <input
          className={inputClassName ?? cx(inputCls, 'tabular', suffix && 'pr-10')}
          inputMode={integer ? 'numeric' : 'decimal'}
          placeholder={placeholder}
          value={text}
          onFocus={(e) => {
            focused.current = true
            e.currentTarget.select()
          }}
          onBlur={() => {
            focused.current = false
            setText(value === null ? '' : num(value, 3))
          }}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.,-]/g, '')
            setText(t)
            const v = parseNum(t)
            onChange(v === null ? null : integer ? Math.round(v) : v)
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cx('flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx(
            'h-10 flex-1 rounded-lg px-2 text-sm font-medium transition',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted',
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Нижняя шторка (модальное окно) ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="anim-fade absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="anim-sheet relative flex max-h-[92dvh] flex-col rounded-t-3xl border-t border-line bg-bg">
        <div className="flex justify-center pt-2.5">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        {title && <div className="px-5 pb-2 pt-3 text-lg font-semibold">{title}</div>}
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line px-4 pt-3 pb-3">{footer}</div>}
        {!footer && <div className="safe-bottom" />}
      </div>
    </div>,
    document.body,
  )
}

/** Меню действий в шторке */
export function ActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  actions: { label: ReactNode; onClick: () => void; danger?: boolean; icon?: ReactNode }[]
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {actions.map((a, i) => (
          <button
            key={i}
            className={cx(
              'flex min-h-13 w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left text-[16px] last:border-b-0 active:bg-surface-2',
              a.danger && 'text-danger',
            )}
            onClick={() => {
              onClose()
              a.onClick()
            }}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <Button block className="mt-3" onClick={onClose}>
        Отмена
      </Button>
    </Sheet>
  )
}

/* ---------------- Всплывающие уведомления ---------------- */

type ToastMsg = { id: number; text: string }
let pushToast: (t: string) => void = () => {}

export const toast = (text: string) => pushToast(text)

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([])
  useEffect(() => {
    pushToast = (text) => {
      const id = Date.now() + Math.random()
      setItems((s) => [...s, { id, text }])
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 2600)
    }
  }, [])
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      {items.map((t) => (
        <div
          key={t.id}
          className="anim-fade rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-lg"
        >
          {t.text}
        </div>
      ))}
    </div>,
    document.body,
  )
}

/* ---------------- Чипы ---------------- */

export function Chip({ children, tone = 'muted' }: { children: ReactNode; tone?: 'up' | 'down' | 'muted' | 'accent' | 'note' }) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center rounded-lg px-2 py-1 text-[13px] leading-snug',
        tone === 'up' && 'bg-up-soft text-up',
        tone === 'down' && 'bg-down-soft text-down',
        tone === 'muted' && 'bg-surface-2 text-muted',
        tone === 'accent' && 'bg-accent-soft text-accent-text',
        tone === 'note' && 'bg-note-soft text-note',
      )}
    >
      <span className="break-words">{children}</span>
    </span>
  )
}

/* ---------------- Кнопка-«плюс» внизу экрана ---------------- */

export function Fab({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink shadow-xl shadow-black/30 active:scale-95"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom) + 12px)' }}
    >
      {icon}
      {label}
    </button>
  )
}

export const confirmAsk = (text: string) => window.confirm(text)
