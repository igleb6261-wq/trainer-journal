import type { Client } from '../db'

export const todayISO = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/** 30 окт 2026 */
export const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const d = parse(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`
}

/** 30 октября 2026 */
export const fmtDateLong = (iso: string) => {
  if (!iso) return '—'
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

/** пятница */
export const weekday = (iso: string) => WEEKDAYS[parse(iso).getDay()]
export const weekdayShort = (iso: string) => WD_SHORT[parse(iso).getDay()]

/** 30.10.26 — для таблиц */
export const fmtDateShort = (iso: string) => {
  const d = parse(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
}

export const daysAgo = (iso: string) => {
  const a = parse(iso).getTime()
  const b = parse(todayISO()).getTime()
  const n = Math.round((b - a) / 86400000)
  if (n === 0) return 'сегодня'
  if (n === 1) return 'вчера'
  if (n < 0) return `через ${-n} ${plural(-n, 'день', 'дня', 'дней')}`
  if (n < 30) return `${n} ${plural(n, 'день', 'дня', 'дней')} назад`
  return fmtDate(iso)
}

export const ageFrom = (birth: string): number | null => {
  if (!birth) return null
  const b = parse(birth)
  const t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
  return a >= 0 && a < 120 ? a : null
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** 62.5 -> "62,5" */
export const num = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const r = Math.round(v * 10 ** digits) / 10 ** digits
  return String(r).replace('.', ',')
}

/** "62,5" -> 62.5 ; "" -> null */
export const parseNum = (s: string): number | null => {
  const t = s.replace(',', '.').trim()
  if (t === '' || t === '-' || t === '.') return null
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}

export const fullName = (c: Pick<Client, 'lastName' | 'firstName' | 'middleName'>) =>
  [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ') || 'Без имени'

export const shortName = (c: Pick<Client, 'lastName' | 'firstName'>) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Без имени'

export const initials = (c: Pick<Client, 'lastName' | 'firstName'>) =>
  ((c.firstName?.[0] ?? '') + (c.lastName?.[0] ?? '')).toUpperCase() || '?'

export const FORMAT_LABEL: Record<string, string> = {
  online: 'Онлайн',
  offline: 'Офлайн',
  mixed: 'Смешанный',
  '': '—',
}

export const SEX_LABEL: Record<string, string> = { m: 'Мужской', f: 'Женский', '': '—' }

export const ANGLE_LABEL: Record<string, string> = {
  front: 'Спереди',
  side: 'Сбоку',
  back: 'Сзади',
  other: 'Другое',
}
