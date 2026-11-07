import type { Client, Program, ProgramDay, Workout } from '../db'
import { todayISO } from './format'

/* ============================================================
   Расписание, следующий день программы, метки клиента.
   ============================================================ */

/** Порядок дней в интерфейсе: с понедельника */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const WD_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export const isoOf = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}

export const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000)
}

/** Время тренировки клиента в этот день недели ('' — без времени), или null если не тренируется */
export const slotOn = (c: Client, iso: string): string | null => {
  const s = c.schedule?.find((x) => x.day === weekdayOf(iso))
  return s ? s.time || '' : null
}

/** Следующий день программы по очереди — после последнего проведённого дня этой программы */
export function nextProgramDay(program: Program | null | undefined, workouts: Workout[]): ProgramDay | null {
  if (!program || !program.days.length) return null
  const done = workouts
    .filter((w) => w.status === 'done' && w.programId === program.id && w.dayId)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
  const last = done[0]
  if (!last) return program.days[0]
  const i = program.days.findIndex((d) => d.id === last.dayId)
  if (i < 0) return program.days[0]
  return program.days[(i + 1) % program.days.length]
}

/** Незавершённая тренировка, о которой, скорее всего, забыли */
export const isStale = (w: Workout) =>
  w.status === 'active' && (w.date < todayISO() || Date.now() - w.createdAt > 12 * 3600 * 1000)

export type Badge = { text: string; tone: 'accent' | 'down' | 'muted' | 'danger' }

/** Метки клиента для списка: формат, новый, оплата, давно не был */
export function clientBadges(c: Client, lastDone: string | undefined, doneCount: number): Badge[] {
  const out: Badge[] = []
  const today = todayISO()
  if (c.format === 'online') out.push({ text: 'Онлайн', tone: 'muted' })
  if (c.format === 'offline') out.push({ text: 'Офлайн', tone: 'muted' })
  if (c.format === 'mixed') out.push({ text: 'Смешанный', tone: 'muted' })
  const startedRecently = c.startDate && daysBetween(c.startDate, today) <= 14
  if (startedRecently || doneCount === 0) out.push({ text: 'Новый', tone: 'accent' })
  if (c.paidUntil) {
    const left = daysBetween(today, c.paidUntil)
    const [, m, d] = c.paidUntil.split('-')
    if (left < 0) out.push({ text: 'Оплата истекла', tone: 'danger' })
    else if (left <= 3) out.push({ text: `Оплачено до ${d}.${m}`, tone: 'down' })
    else out.push({ text: `Оплачено до ${d}.${m}`, tone: 'muted' })
  }
  if (lastDone && !c.archived) {
    const n = daysBetween(lastDone, today)
    if (n >= 14) out.push({ text: `Не был ${n} дн.`, tone: 'down' })
  }
  return out
}
