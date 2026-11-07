import type { SetEntry } from '../db'
import { num } from './format'

/* ============================================================
   Подсказка двойной прогрессии: если в прошлый раз все рабочие
   подходы дошли до верхней границы повторов с нужным запасом —
   можно прибавить вес.
   ============================================================ */

/** Шаг веса: до 20 кг — по 1 кг (гантели), дальше — по 2,5 кг */
export const weightStep = (v: number, dir: 1 | -1) => (dir === 1 ? (v >= 20 ? 2.5 : 1) : v > 20 ? 2.5 : 1)

const toNum = (s: string) => Number(s.replace(',', '.'))

/** Из строки плана «3×8-12 · 40 кг · RIR 2» достаёт верх диапазона повторов и запас */
export function parseTarget(target: string): { topReps: number | null; rir: number | null } {
  const reps = target.match(/×\s*(\d+)(?:\s*[-–]\s*(\d+))?/)
  const rir = target.match(/RIR\s*([\d.,]+)/i)
  return {
    topReps: reps ? Number(reps[2] ?? reps[1]) : null,
    rir: rir ? toNum(rir[1]) : null,
  }
}

export interface Hint {
  text: string
  weight: number
}

export function progressionHint(target: string, prevSets: SetEntry[], current: SetEntry[]): Hint | null {
  const { topReps, rir } = parseTarget(target)
  if (!topReps) return null
  const work = prevSets.filter((s) => s.reps !== null && s.weight !== null && (s.done || prevSets.every((x) => !x.done)))
  if (work.length < 1) return null
  const maxW = Math.max(...work.map((s) => s.weight as number))
  const top = work.filter((s) => s.weight === maxW)
  if (!top.every((s) => (s.reps as number) >= topReps)) return null
  if (rir !== null && top.some((s) => s.rir !== null && (s.rir as number) < rir)) return null
  const next = Math.round((maxW + weightStep(maxW, 1)) * 100) / 100
  // уже поставили новый вес — подсказка не нужна
  const pending = current.filter((s) => !s.done)
  if (pending.length && pending.every((s) => (s.weight ?? 0) >= next)) return null
  return {
    text: `В прошлый раз все подходы с ${num(maxW)} кг — на верхней границе (${topReps})${rir !== null ? ' с нужным запасом' : ''}. Можно прибавить вес.`,
    weight: next,
  }
}
