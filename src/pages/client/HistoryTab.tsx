import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Client, type Workout } from '../../db'
import { Button, Card, Chip, Empty, SwipeToDelete, confirmAsk, cx, toast } from '../../components/ui'
import { IconChart, IconDown, IconEdit, IconFlag, IconTrash } from '../../components/icons'
import { fmtDateLong, weekday } from '../../lib/format'
import { setsLine, workoutSummary } from '../../lib/summary'

const sortDesc = (a: Workout, b: Workout) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))

export default function HistoryTab({ client }: { client: Client }) {
  const nav = useNavigate()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const all = useLiveQuery(async () => (await db.workouts.where('clientId').equals(client.id).toArray()).sort(sortDesc), [client.id])

  if (!all) return null
  const done = all.filter((w) => w.status === 'done')

  if (!done.length)
    return <Empty title="Истории пока нет" text="После завершения первой тренировки здесь появится запись со всеми подходами и сводкой изменений." />

  return (
    <div className="mt-4">
      <Button variant="soft" block onClick={() => nav(`/client/${client.id}/progress`)}>
        <IconChart size={20} /> Прогресс по упражнениям
      </Button>

      <div className="mt-4 space-y-3">
        {done.map((w) => {
          const { chips, unchanged } = workoutSummary(w, all)
          const isOpen = !!open[w.id]
          return (
            <SwipeToDelete
              key={w.id}
              onDelete={async () => {
                if (!confirmAsk(`Удалить тренировку от ${fmtDateLong(w.date)}? Это нельзя отменить.`)) return false
                await db.workouts.delete(w.id)
                toast('Тренировка удалена')
                return true
              }}
            >
            <Card className="overflow-hidden">
              <button className="block w-full px-4 pt-3 text-left" onClick={() => setOpen((o) => ({ ...o, [w.id]: !isOpen }))}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold">
                      {fmtDateLong(w.date)}
                      <span className="font-normal text-muted">, {weekday(w.date)}</span>
                    </div>
                    <div className="text-[13px] text-muted">
                      {w.dayName || 'Свободная тренировка'} · {w.exercises.length} упр.
                    </div>
                  </div>
                  <span
                    role="button"
                    aria-label="Удалить тренировку"
                    className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-danger-soft active:text-danger"
                    onClick={async (ev) => {
                      ev.stopPropagation()
                      if (!confirmAsk(`Удалить тренировку от ${fmtDateLong(w.date)}? Это нельзя отменить.`)) return
                      await db.workouts.delete(w.id)
                      toast('Тренировка удалена')
                    }}
                  >
                    <IconTrash size={18} />
                  </span>
                  <IconDown size={20} className={cx('mt-1 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
                </div>

                {(chips.length > 0 || unchanged > 0) && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {chips.map((c, i) => (
                      <Chip
                        key={i}
                        tone={c.kind === 'up' ? 'up' : c.kind === 'down' ? 'down' : c.kind === 'new' ? 'accent' : c.kind === 'note' ? 'note' : 'muted'}
                      >
                        {c.kind === 'note' ? '💬 ' : ''}
                        {c.text}
                      </Chip>
                    ))}
                    {unchanged > 0 && <Chip>без изменений: {unchanged}</Chip>}
                  </div>
                )}

                {w.comment && <div className="mt-2.5 line-clamp-2 whitespace-pre-wrap text-sm text-muted">{w.comment}</div>}
                {w.nextNote && (
                  <div className="mt-2 flex gap-1.5 text-sm text-note">
                    <IconFlag size={14} className="mt-0.5 shrink-0" />
                    <span className={cx('whitespace-pre-wrap', !isOpen && 'line-clamp-2')}>{w.nextNote}</span>
                  </div>
                )}
                <div className="h-3" />
              </button>

              {isOpen && (
                <div className="border-t border-line bg-surface-2/40 px-4 py-3">
                  <div className="space-y-3">
                    {w.exercises.map((e, i) => (
                      <div key={e.id}>
                        <div className="text-[15px] font-medium">
                          <span className="text-muted tabular">{i + 1}. </span>
                          {e.name}
                        </div>
                        <div className="mt-1 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 text-[13px] tabular">
                          <div className="text-muted">#</div>
                          <div className="text-muted">вес</div>
                          <div className="text-muted">повт.</div>
                          <div className="text-muted">запас</div>
                          {e.sets
                            .filter((s) => s.reps !== null || s.weight !== null)
                            .map((s, si) => (
                              <div key={s.id} className={cx('contents', !s.done && 'opacity-50')}>
                                <div className="text-muted">{si + 1}</div>
                                <div>{s.weight !== null ? `${String(s.weight).replace('.', ',')} кг` : '—'}</div>
                                <div>{s.reps ?? '—'}</div>
                                <div>{s.rir !== null ? String(s.rir).replace('.', ',') : '—'}</div>
                              </div>
                            ))}
                        </div>
                        {e.sets.every((s) => s.reps === null && s.weight === null) && (
                          <div className="text-[13px] text-muted">{setsLine(e.sets)}</div>
                        )}
                        {e.comment && <div className="mt-1 whitespace-pre-wrap text-[13px] text-note">💬 {e.comment}</div>}
                      </div>
                    ))}
                  </div>
                  {w.comment && (
                    <div className="mt-4">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Комментарий</div>
                      <div className="mt-0.5 whitespace-pre-wrap text-sm">{w.comment}</div>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => nav(`/client/${client.id}/workout/${w.id}`)}>
                      <IconEdit size={16} /> Редактировать
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        if (!confirmAsk(`Удалить тренировку от ${fmtDateLong(w.date)}? Это нельзя отменить.`)) return
                        await db.workouts.delete(w.id)
                        toast('Тренировка удалена')
                      }}
                    >
                      <IconTrash size={16} /> Удалить
                    </Button>
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          )
        })}
      </div>

      <Button
        variant="danger"
        block
        className="mt-6"
        onClick={async () => {
          if (!confirmAsk(`Удалить ВСЮ историю тренировок клиента (${done.length})? Программа, анкета, замеры и фото останутся. Это нельзя отменить.`))
            return
          if (!confirmAsk('Точно очистить историю? Перед этим лучше сделать резервную копию в Настройках.')) return
          await db.workouts.bulkDelete(done.map((w) => w.id))
          toast('История тренировок очищена')
        }}
      >
        <IconTrash size={18} /> Очистить историю тренировок
      </Button>
    </div>
  )
}
