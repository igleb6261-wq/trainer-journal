import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Client, type Workout } from '../db'
import { Avatar } from '../components/media'
import { Button, Card, Empty, Section, TopBar, confirmAsk, cx, toast } from '../components/ui'
import { IconCheck, IconChevron, IconFlag, IconPlay } from '../components/icons'
import { daysAgo, fmtDateLong, fullName, plural, shortName, todayISO, weekday } from '../lib/format'
import { WD_SHORT, addDays, clientBadges, isStale, nextProgramDay, slotOn, weekdayOf } from '../lib/schedule'
import { finishWorkout, startWorkout } from '../lib/workout'

const sortDesc = (a: Workout, b: Workout) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))

export default function Today() {
  const nav = useNavigate()
  const today = todayISO()
  const [day, setDay] = useState(today)
  const clients = useLiveQuery(async () => (await db.clients.toArray()).filter((c) => !c.archived), [])
  const programs = useLiveQuery(() => db.programs.toArray(), [])
  const workouts = useLiveQuery(async () => (await db.workouts.toArray()).sort(sortDesc), [])

  const byClient = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of workouts ?? []) m.set(w.clientId, [...(m.get(w.clientId) ?? []), w])
    return m
  }, [workouts])

  if (!clients || !programs || !workouts) return <TopBar title="Сегодня" />

  const activeProgram = (c: Client) => programs.find((p) => p.clientId === c.id && p.active) ?? null
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const countOn = (d: string) => clients.filter((c) => slotOn(c, d) !== null).length

  const scheduled = clients
    .map((c) => ({ c, time: slotOn(c, day) }))
    .filter((x): x is { c: Client; time: string } => x.time !== null)
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99') || fullName(a.c).localeCompare(fullName(b.c), 'ru'))
  const scheduledIds = new Set(scheduled.map((x) => x.c.id))
  const extra = workouts.filter((w) => w.date === day && !scheduledIds.has(w.clientId) && clients.some((c) => c.id === w.clientId))

  // требуют внимания (только на сегодня)
  const stale = workouts.filter((w) => isStale(w) && clients.some((c) => c.id === w.clientId))
  const attention = clients
    .map((c) => {
      const done = (byClient.get(c.id) ?? []).filter((w) => w.status === 'done')
      const b = clientBadges(c, done[0]?.date, done.length).filter((x) => x.tone === 'danger' || x.tone === 'down')
      return { c, b }
    })
    .filter((x) => x.b.length)

  const begin = async (c: Client) => {
    const p = activeProgram(c)
    const d = nextProgramDay(p, byClient.get(c.id) ?? [])
    const wid = await startWorkout(c.id, d ? p : null, d)
    nav(`/client/${c.id}/workout/${wid}`)
  }

  const isToday = day === today
  const nothingScheduled = clients.every((c) => !c.schedule?.length)

  return (
    <div>
      <TopBar title="Сегодня" subtitle={`${weekday(today)}, ${fmtDateLong(today)}`} />

      {/* неделя */}
      <div className="grid grid-cols-7 gap-1 px-3 pt-3">
        {days.map((d) => {
          const n = countOn(d)
          const on = d === day
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={cx('flex flex-col items-center rounded-xl py-1.5', on ? 'bg-accent text-accent-ink' : 'bg-surface text-ink')}
            >
              <span className={cx('text-[11px] font-medium', on ? '' : 'text-muted')}>{d === today ? 'Сег' : WD_SHORT[weekdayOf(d)]}</span>
              <span className="text-[17px] font-semibold tabular">{Number(d.slice(8))}</span>
              <span className={cx('mt-0.5 h-1.5 w-1.5 rounded-full', n ? (on ? 'bg-accent-ink' : 'bg-accent') : 'bg-transparent')} />
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-4">
        {nothingScheduled ? (
          <Empty
            title="Расписание пока не заполнено"
            text="Открой клиента → «⋯» → «Редактировать данные» → «Дни тренировок». Здесь появятся все, кто записан на день."
          />
        ) : (
          <Section title={`${isToday ? 'Сегодня' : `${weekday(day)}, ${fmtDateLong(day)}`} · ${scheduled.length} ${plural(scheduled.length, 'тренировка', 'тренировки', 'тренировок')}`}>
            {scheduled.length === 0 ? (
              <Card className="p-4 text-sm text-muted">В этот день по расписанию никого нет</Card>
            ) : (
              <Card className="overflow-hidden">
                {scheduled.map(({ c, time }) => {
                  const ws = byClient.get(c.id) ?? []
                  const doneToday = ws.find((w) => w.date === day && w.status === 'done')
                  const active = ws.find((w) => w.status === 'active')
                  const next = nextProgramDay(activeProgram(c), ws)
                  const lastDone = ws.find((w) => w.status === 'done')
                  return (
                    <div
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-3 last:border-b-0 active:bg-surface-2"
                      onClick={() => nav(`/client/${c.id}`)}
                    >
                      <div className="w-11 shrink-0 text-center text-[15px] font-semibold tabular">{time || '—'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium">{shortName(c)}</div>
                        <div className="truncate text-[13px] text-muted">
                          {next ? next.name : 'Программы нет'}
                        </div>
                        {lastDone?.nextNote.trim() && !doneToday && (
                          <div className="flex items-center gap-1 truncate text-[13px] text-note">
                            <IconFlag size={12} className="shrink-0" />
                            <span className="truncate">{lastDone.nextNote}</span>
                          </div>
                        )}
                      </div>
                      {isToday &&
                        (doneToday ? (
                          <span className="flex items-center gap-1 text-[13px] font-medium text-up">
                            <IconCheck size={16} /> Проведена
                          </span>
                        ) : active ? (
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={(e) => {
                              e.stopPropagation()
                              nav(`/client/${c.id}/workout/${active.id}`)
                            }}
                          >
                            Идёт
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              begin(c)
                            }}
                          >
                            <IconPlay size={13} /> Начать
                          </Button>
                        ))}
                    </div>
                  )
                })}
              </Card>
            )}
          </Section>
        )}

        {extra.length > 0 && (
          <Section title="Вне расписания">
            <Card className="overflow-hidden">
              {extra.map((w) => {
                const c = clients.find((x) => x.id === w.clientId)!
                return (
                  <div
                    key={w.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0 active:bg-surface-2"
                    onClick={() => nav(w.status === 'active' ? `/client/${c.id}/workout/${w.id}` : `/client/${c.id}?tab=history`)}
                  >
                    <Avatar client={c} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{fullName(c)}</div>
                      <div className="truncate text-[13px] text-muted">
                        {w.dayName || 'Свободная тренировка'} · {w.status === 'active' ? 'идёт' : 'проведена'}
                      </div>
                    </div>
                    <IconChevron size={18} className="text-muted" />
                  </div>
                )
              })}
            </Card>
          </Section>
        )}

        {isToday && (stale.length > 0 || attention.length > 0) && (
          <Section title="Требуют внимания">
            <div className="space-y-2">
              {stale.map((w) => {
                const c = clients.find((x) => x.id === w.clientId)!
                return (
                  <Card key={w.id} className="p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar client={c} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{fullName(c)}</div>
                        <div className="text-[13px] text-down">Тренировка не завершена · начата {daysAgo(w.date)}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <Button size="sm" variant="primary" onClick={async () => {
                        await finishWorkout(w)
                        toast('Тренировка сохранена в истории')
                      }}>
                        Завершить
                      </Button>
                      <Button size="sm" onClick={() => nav(`/client/${c.id}/workout/${w.id}`)}>
                        Открыть
                      </Button>
                      <Button size="sm" variant="danger" onClick={async () => {
                        if (!confirmAsk('Удалить незавершённую тренировку?')) return
                        await db.workouts.delete(w.id)
                        toast('Тренировка удалена')
                      }}>
                        Удалить
                      </Button>
                    </div>
                  </Card>
                )
              })}
              {attention.length > 0 && (
                <Card className="overflow-hidden">
                  {attention.map(({ c, b }) => (
                    <div
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0 active:bg-surface-2"
                      onClick={() => nav(`/client/${c.id}`)}
                    >
                      <Avatar client={c} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{fullName(c)}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {b.map((x) => (
                            <span
                              key={x.text}
                              className={cx(
                                'rounded-md px-1.5 py-0.5 text-[12px] font-medium',
                                x.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-down-soft text-down',
                              )}
                            >
                              {x.text}
                            </span>
                          ))}
                        </div>
                      </div>
                      <IconChevron size={18} className="text-muted" />
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
