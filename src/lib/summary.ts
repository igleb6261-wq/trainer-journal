import type { SetEntry, Workout, WorkoutExercise } from '../db'
import { exKey } from '../db'
import { num } from './format'

/* ============================================================
   Автоматическая сводка изменений тренировки
   по сравнению с прошлым выполнением тех же упражнений.
   ============================================================ */

export type ChipKind = 'up' | 'down' | 'same' | 'new' | 'note' | 'info'

export interface Chip {
  kind: ChipKind
  text: string
}

export interface ExerciseStats {
  sets: number
  topWeight: number | null
  repsAtTop: number | null // лучшие повторения в подходе с макс. весом
  totalReps: number
  avgRir: number | null
  volume: number // тоннаж
}

const doneSets = (sets: SetEntry[]) => {
  const d = sets.filter((s) => s.done && (s.reps !== null || s.weight !== null))
  // если ни один подход не отмечен — считаем все заполненные (на случай забытых галочек)
  return d.length ? d : sets.filter((s) => s.reps !== null)
}

export function stats(ex: WorkoutExercise): ExerciseStats {
  const sets = doneSets(ex.sets)
  const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null)
  const topWeight = weights.length ? Math.max(...weights) : null
  const atTop = sets.filter((s) => (topWeight === null ? true : s.weight === topWeight))
  const repsList = atTop.map((s) => s.reps).filter((r): r is number => r !== null)
  const rirs = sets.map((s) => s.rir).filter((r): r is number => r !== null)
  return {
    sets: sets.length,
    topWeight,
    repsAtTop: repsList.length ? Math.max(...repsList) : null,
    totalReps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
    avgRir: rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null,
    volume: sets.reduce((a, s) => a + (s.reps ?? 0) * (s.weight ?? 0), 0),
  }
}

/** Ищет прошлое выполнение упражнения в более ранних тренировках (отсортированы: новые первыми) */
export function findPrevious(
  name: string,
  current: Workout,
  history: Workout[],
): { workout: Workout; exercise: WorkoutExercise } | null {
  const key = exKey(name)
  for (const w of history) {
    if (w.id === current.id || w.status !== 'done') continue
    if (w.date > current.date) continue
    if (w.date === current.date && w.createdAt >= current.createdAt) continue
    const ex = w.exercises.find((e) => exKey(e.name) === key)
    if (ex && doneSets(ex.sets).length) return { workout: w, exercise: ex }
  }
  return null
}

const arrow = (a: number, b: number): ChipKind => (b > a ? 'up' : b < a ? 'down' : 'same')
const sign = (k: ChipKind) => (k === 'up' ? ' ↑' : k === 'down' ? ' ↓' : '')

/** Сводка по одному упражнению */
export function exerciseChange(cur: WorkoutExercise, prev: WorkoutExercise | null): Chip[] {
  const s = stats(cur)
  if (!s.sets) return []
  if (!prev) return [{ kind: 'new', text: `Новое: ${cur.name}` }]
  const p = stats(prev)
  const parts: string[] = []
  let kind: ChipKind = 'same'

  if (s.topWeight !== null && p.topWeight !== null && s.topWeight !== p.topWeight) {
    kind = arrow(p.topWeight, s.topWeight)
    parts.push(`вес ${num(p.topWeight)} → ${num(s.topWeight)} кг${sign(kind)}`)
  } else if (s.repsAtTop !== null && p.repsAtTop !== null && s.repsAtTop !== p.repsAtTop) {
    kind = arrow(p.repsAtTop, s.repsAtTop)
    parts.push(`повторения ${p.repsAtTop} → ${s.repsAtTop}${sign(kind)}`)
  }
  if (s.sets !== p.sets) {
    const k = arrow(p.sets, s.sets)
    if (kind === 'same') kind = k
    parts.push(`подходы ${p.sets} → ${s.sets}`)
  }
  if (s.avgRir !== null && p.avgRir !== null && Math.abs(s.avgRir - p.avgRir) >= 0.5) {
    parts.push(`RIR ${num(p.avgRir, 1)} → ${num(s.avgRir, 1)}`)
  }
  if (!parts.length) return []
  return [{ kind, text: `${cur.name}: ${parts.join(', ')}` }]
}

/** Полная сводка тренировки */
export function workoutSummary(w: Workout, history: Workout[]): { chips: Chip[]; unchanged: number } {
  const chips: Chip[] = []
  let unchanged = 0
  for (const ex of w.exercises) {
    const prev = findPrevious(ex.name, w, history)
    const c = exerciseChange(ex, prev?.exercise ?? null)
    if (c.length) chips.push(...c)
    else if (stats(ex).sets) unchanged++
    if (ex.comment.trim()) chips.push({ kind: 'note', text: `${ex.name}: ${ex.comment.trim()}` })
  }
  return { chips, unchanged }
}

/** Краткая строка подходов: "60×10, 62,5×8, 62,5×8" */
export function setsLine(sets: SetEntry[], withRir = false): string {
  const d = sets.filter((s) => s.reps !== null || s.weight !== null)
  if (!d.length) return '—'
  return d
    .map((s) => {
      const w = s.weight !== null ? num(s.weight) : '—'
      const r = s.reps !== null ? s.reps : '—'
      const rir = withRir && s.rir !== null ? ` (${num(s.rir, 1)})` : ''
      return s.weight !== null ? `${w}×${r}${rir}` : `${r}${rir}`
    })
    .join(', ')
}
