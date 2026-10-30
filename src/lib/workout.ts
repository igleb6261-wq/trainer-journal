import { db, exKey, stamp, uid, type PlanExercise, type Program, type ProgramDay, type SetEntry, type Workout, type WorkoutExercise } from '../db'
import { num, todayISO } from './format'

/** "3×8-12 · 60 кг · RIR 2 · отдых 2 мин" */
export function planTarget(p: PlanExercise): string {
  const parts: string[] = []
  if (p.sets || p.reps) parts.push(`${p.sets ?? '?'}×${p.reps || '?'}`)
  if (p.weight !== null) parts.push(`${num(p.weight)} кг`)
  if (p.rir) parts.push(`RIR ${p.rir}`)
  if (p.rest) parts.push(`отдых ${p.rest}`)
  return parts.join(' · ')
}

const firstNum = (s: string): number | null => {
  const m = s.match(/\d+([.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : null
}

export const emptySet = (prev?: Partial<SetEntry>): SetEntry => ({
  id: uid(),
  weight: prev?.weight ?? null,
  reps: prev?.reps ?? null,
  rir: prev?.rir ?? null,
  done: false,
})

/** Последнее выполнение упражнения у клиента (из завершённых тренировок) */
export async function lastPerformance(clientId: string, name: string, excludeId?: string): Promise<{ workout: Workout; exercise: WorkoutExercise } | null> {
  const key = exKey(name)
  const ws = await db.workouts.where('clientId').equals(clientId).toArray()
  ws.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
  for (const w of ws) {
    if (w.status !== 'done' || w.id === excludeId) continue
    const ex = w.exercises.find((e) => exKey(e.name) === key && e.sets.some((s) => s.reps !== null || s.weight !== null))
    if (ex) return { workout: w, exercise: ex }
  }
  return null
}

/** Готовит упражнение для тренировки: подходы заполнены прошлым результатом, иначе — целью из программы */
export async function buildExercise(clientId: string, p: PlanExercise | { name: string }): Promise<WorkoutExercise> {
  const plan = 'sets' in p ? p : null
  const prev = await lastPerformance(clientId, p.name)
  let sets: SetEntry[]
  if (prev) {
    const filled = prev.exercise.sets.filter((s) => s.reps !== null || s.weight !== null)
    sets = filled.map((s) => emptySet({ weight: s.weight, reps: s.reps, rir: s.rir }))
    const want = plan?.sets ?? 0
    while (sets.length < want) sets.push(emptySet(filled[filled.length - 1]))
  } else {
    const n = plan?.sets ?? 3
    sets = Array.from({ length: Math.max(1, n) }, () =>
      emptySet({
        weight: plan?.weight ?? null,
        reps: plan ? firstNum(plan.reps) : null,
        rir: plan ? firstNum(plan.rir) : null,
      }),
    )
  }
  return {
    id: uid(),
    name: p.name,
    planNote: plan?.note ?? '',
    target: plan ? planTarget(plan) : '',
    comment: '',
    sets,
  }
}

export async function startWorkout(clientId: string, program: Program | null, day: ProgramDay | null): Promise<string> {
  const exercises: WorkoutExercise[] = []
  for (const p of day?.exercises ?? []) {
    if (p.name.trim()) exercises.push(await buildExercise(clientId, p))
  }
  const w: Workout = {
    ...stamp(),
    clientId,
    date: todayISO(),
    programId: program?.id ?? null,
    dayId: day?.id ?? null,
    dayName: day ? day.name || program?.name || '' : '',
    status: 'active',
    exercises,
    comment: '',
    nextNote: '',
    finishedAt: null,
  }
  await db.workouts.add(w)
  return w.id
}
