import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey, type WorkoutExercise } from '../db'
import { Card, Empty, Section, TopBar } from '../components/ui'
import { IconChevron } from '../components/icons'
import { LineChart } from '../components/LineChart'
import { daysAgo, fmtDate, fmtDateShort, fullName, num } from '../lib/format'
import { setsLine, stats } from '../lib/summary'

export default function ExerciseProgress() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const selected = sp.get('name')

  const client = useLiveQuery(() => db.clients.get(id), [id])
  const workouts = useLiveQuery(
    async () =>
      (await db.workouts.where('clientId').equals(id).toArray())
        .filter((w) => w.status === 'done')
        .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date))),
    [id],
  )

  const byExercise = useMemo(() => {
    const m = new Map<string, { name: string; entries: { date: string; workoutId: string; ex: WorkoutExercise }[] }>()
    for (const w of workouts ?? []) {
      for (const e of w.exercises) {
        if (!stats(e).sets) continue
        const k = exKey(e.name)
        const item = m.get(k) ?? { name: e.name, entries: [] }
        item.name = e.name
        item.entries.push({ date: w.date, workoutId: w.id, ex: e })
        m.set(k, item)
      }
    }
    return m
  }, [workouts])

  if (!client || !workouts) return <TopBar title="Прогресс" back />

  if (!selected) {
    const list = [...byExercise.values()].sort((a, b) => b.entries.length - a.entries.length)
    return (
      <div className="pb-10">
        <TopBar title="Прогресс по упражнениям" subtitle={fullName(client)} back />
        <div className="px-4 pt-3">
          {list.length === 0 ? (
            <Empty title="Пока нет данных" text="Прогресс появится после первых завершённых тренировок." />
          ) : (
            <Card className="overflow-hidden">
              {list.map((x) => {
                const last = x.entries[x.entries.length - 1]
                const s = stats(last.ex)
                return (
                  <div
                    key={x.name}
                    className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-surface-2"
                    onClick={() => setSp({ name: x.name })}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{x.name}</div>
                      <div className="text-[13px] text-muted">
                        {x.entries.length} раз · последний {daysAgo(last.date)}
                        {s.topWeight !== null && ` · ${num(s.topWeight)} кг`}
                      </div>
                    </div>
                    <IconChevron size={18} className="text-muted" />
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      </div>
    )
  }

  const item = byExercise.get(exKey(selected))
  const entries = item?.entries ?? []
  const hasWeight = entries.some((e) => stats(e.ex).topWeight !== null)
  const points = entries.map((e) => {
    const s = stats(e.ex)
    return { label: fmtDateShort(e.date).slice(0, 5), value: hasWeight ? s.topWeight ?? 0 : s.totalReps }
  })

  return (
    <div className="pb-10">
      <TopBar title={item?.name ?? selected} subtitle={fullName(client)} back />
      <div className="px-4 pt-2">
        <Section title={hasWeight ? 'Рабочий вес (максимум за тренировку)' : 'Повторений за тренировку'}>
          <Card className="p-3">
            <LineChart points={points} unit={hasWeight ? 'кг' : 'повт'} />
          </Card>
        </Section>

        <Section title="Все выполнения">
          <Card className="overflow-hidden">
            {[...entries].reverse().map((e) => {
              const s = stats(e.ex)
              return (
                <div
                  key={e.workoutId}
                  className="cursor-pointer border-b border-line px-4 py-3 last:border-b-0 active:bg-surface-2"
                  onClick={() => nav(`/client/${id}/workout/${e.workoutId}`)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[15px] font-medium">{fmtDate(e.date)}</div>
                    <div className="text-[13px] text-muted tabular">
                      {s.volume > 0 && `тоннаж ${num(s.volume, 0)} кг`}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[14px] tabular">{setsLine(e.ex.sets, true)}</div>
                  {e.ex.comment && <div className="mt-0.5 text-[13px] text-note">💬 {e.ex.comment}</div>}
                </div>
              )
            })}
          </Card>
          <div className="px-1 pt-2 text-xs text-muted">Формат: вес×повторы (запас)</div>
        </Section>
      </div>
    </div>
  )
}
