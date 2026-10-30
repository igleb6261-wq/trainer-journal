import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '../db'
import { Avatar } from '../components/media'
import { Card, Chip, Empty, Section, TopBar } from '../components/ui'
import { IconChevron, IconPlay } from '../components/icons'
import { fmtDate, fmtDateLong, fullName, weekday } from '../lib/format'
import { workoutSummary } from '../lib/summary'

const sortDesc = (a: Workout, b: Workout) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))

export default function Journal() {
  const nav = useNavigate()
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const workouts = useLiveQuery(async () => (await db.workouts.toArray()).sort(sortDesc), [])

  const clientMap = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients])
  const byClient = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of workouts ?? []) m.set(w.clientId, [...(m.get(w.clientId) ?? []), w])
    return m
  }, [workouts])

  if (!clients || !workouts) return <TopBar title="Журнал" />

  const active = workouts.filter((w) => w.status === 'active' && clientMap.has(w.clientId))
  const done = workouts.filter((w) => w.status === 'done' && clientMap.has(w.clientId)).slice(0, 60)

  // группировка по дате
  const groups: { date: string; items: Workout[] }[] = []
  for (const w of done) {
    const g = groups[groups.length - 1]
    if (g && g.date === w.date) g.items.push(w)
    else groups.push({ date: w.date, items: [w] })
  }

  return (
    <div>
      <TopBar title="Журнал" subtitle="Последние тренировки всех клиентов" />
      <div className="px-4 pb-6">
        {active.length > 0 && (
          <Section title="Идут сейчас">
            <div className="space-y-2">
              {active.map((w) => {
                const c = clientMap.get(w.clientId)!
                return (
                  <Card
                    key={w.id}
                    className="flex items-center gap-3 border-accent-text/40 bg-accent-soft p-3"
                    onClick={() => nav(`/client/${c.id}/workout/${w.id}`)}
                  >
                    <Avatar client={c} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{fullName(c)}</div>
                      <div className="text-[13px] text-accent-text">
                        <IconPlay size={10} className="inline" /> {w.dayName || 'Свободная'} · {fmtDate(w.date)}
                      </div>
                    </div>
                    <IconChevron size={18} className="text-muted" />
                  </Card>
                )
              })}
            </div>
          </Section>
        )}

        {groups.length === 0 && active.length === 0 && (
          <Empty title="Тренировок пока нет" text="Здесь будут все проведённые тренировки, по дням." />
        )}

        {groups.map((g) => (
          <Section key={g.date} title={`${fmtDateLong(g.date)}, ${weekday(g.date)}`}>
            <div className="space-y-2">
              {g.items.map((w) => {
                const c = clientMap.get(w.clientId)!
                const { chips } = workoutSummary(w, byClient.get(w.clientId) ?? [])
                const shown = chips.filter((x) => x.kind !== 'note').slice(0, 3)
                return (
                  <Card key={w.id} className="p-3" onClick={() => nav(`/client/${c.id}?tab=history`)}>
                    <div className="flex items-center gap-3">
                      <Avatar client={c} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{fullName(c)}</div>
                        <div className="truncate text-[13px] text-muted">
                          {w.dayName || 'Свободная тренировка'} · {w.exercises.length} упр.
                        </div>
                      </div>
                    </div>
                    {shown.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {shown.map((x, i) => (
                          <Chip key={i} tone={x.kind === 'up' ? 'up' : x.kind === 'down' ? 'down' : x.kind === 'new' ? 'accent' : 'muted'}>
                            {x.text}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </Section>
        ))}
      </div>
    </div>
  )
}
