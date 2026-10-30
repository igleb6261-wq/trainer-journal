import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, stamp, uid, type Client, type Program } from '../../db'
import { ActionSheet, Button, Card, Empty, IconButton, Section, Sheet, confirmAsk, toast } from '../../components/ui'
import { IconChevron, IconEdit, IconMore, IconPlay, IconPlus, IconTrash } from '../../components/icons'
import { planTarget, startWorkout } from '../../lib/workout'
import { fmtDate } from '../../lib/format'

export async function createProgram(clientId: string): Promise<string> {
  const p: Program = {
    ...stamp(),
    clientId,
    name: 'Программа',
    active: true,
    notes: '',
    days: [{ id: uid(), name: 'День A', exercises: [] }],
  }
  await db.transaction('rw', db.programs, async () => {
    const others = await db.programs.where('clientId').equals(clientId).toArray()
    for (const o of others) if (o.active) await db.programs.update(o.id, { active: false })
    await db.programs.add(p)
  })
  return p.id
}

export default function ProgramTab({ client, activeWorkoutId }: { client: Client; activeWorkoutId?: string }) {
  const nav = useNavigate()
  const programs = useLiveQuery(() => db.programs.where('clientId').equals(client.id).toArray(), [client.id])
  const [pick, setPick] = useState(false)
  const [menuFor, setMenuFor] = useState<Program | null>(null)

  if (!programs) return null
  const sorted = [...programs].sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt - a.updatedAt)
  const active = sorted.find((p) => p.active) ?? null
  const others = sorted.filter((p) => p !== active)

  const deleteProgram = async (p: Program) => {
    if (!confirmAsk(`Удалить программу «${p.name}»? История проведённых тренировок останется.`)) return
    await db.programs.delete(p.id)
    // если удалили текущую — текущей становится последняя изменённая из оставшихся
    if (p.active) {
      const rest = programs.filter((x) => x.id !== p.id).sort((a, b) => b.updatedAt - a.updatedAt)
      if (rest[0]) await db.programs.update(rest[0].id, { active: true })
    }
    toast('Программа удалена')
  }

  const begin = async (dayId: string | null) => {
    setPick(false)
    const day = active?.days.find((d) => d.id === dayId) ?? null
    const wid = await startWorkout(client.id, day ? active : null, day)
    nav(`/client/${client.id}/workout/${wid}`)
  }

  const newProgram = async () => {
    const id = await createProgram(client.id)
    nav(`/client/${client.id}/program/${id}`)
  }

  return (
    <div>
      <div className="mt-4">
        {activeWorkoutId ? (
          <Button variant="primary" size="lg" block onClick={() => nav(`/client/${client.id}/workout/${activeWorkoutId}`)}>
            <IconPlay size={18} /> Продолжить тренировку
          </Button>
        ) : (
          <Button variant="primary" size="lg" block onClick={() => setPick(true)}>
            <IconPlay size={18} /> Начать тренировку
          </Button>
        )}
      </div>

      {!active ? (
        <Empty
          title="Программы пока нет"
          text="Создай программу: тренировочные дни и упражнения с подходами, повторениями, весом и запасом."
          action={
            <Button variant="soft" onClick={newProgram}>
              <IconPlus size={20} /> Создать программу
            </Button>
          }
        />
      ) : (
        <>
          <Section
            title="Текущая программа"
            action={
              <IconButton className="h-8 w-8 text-muted" onClick={() => setMenuFor(active)}>
                <IconMore size={20} />
              </IconButton>
            }
          >
            <Card className="overflow-hidden" onClick={() => nav(`/client/${client.id}/program/${active.id}`)}>
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <div className="flex-1">
                  <div className="text-[16px] font-semibold">{active.name}</div>
                  <div className="text-xs text-muted">обновлена {fmtDate(new Date(active.updatedAt).toISOString().slice(0, 10))} </div>
                </div>
                <IconChevron size={18} className="text-muted" />
              </div>
              {active.notes && <div className="whitespace-pre-wrap border-b border-line px-4 py-3 text-sm text-muted">{active.notes}</div>}
              {active.days.map((d) => (
                <div key={d.id} className="border-b border-line px-4 py-3 last:border-b-0">
                  <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-accent-text">{d.name || 'День'}</div>
                  {d.exercises.length === 0 && <div className="text-sm text-muted">Нет упражнений</div>}
                  <ol className="space-y-1.5">
                    {d.exercises.map((e, i) => (
                      <li key={e.id} className="flex gap-2 text-[15px]">
                        <span className="w-5 shrink-0 text-right text-muted tabular">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <div>{e.name || 'Без названия'}</div>
                          {planTarget(e) && <div className="text-[13px] text-muted tabular">{planTarget(e)}</div>}
                          {e.note && <div className="text-[13px] italic text-muted">{e.note}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </Card>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button onClick={() => nav(`/client/${client.id}/program/${active.id}`)}>
                <IconEdit size={18} /> Редактировать
              </Button>
              <Button variant="danger" onClick={() => deleteProgram(active)}>
                <IconTrash size={18} /> Удалить
              </Button>
            </div>
          </Section>

          {others.length > 0 && (
            <Section title="Другие программы">
              <Card className="overflow-hidden">
                {others.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 border-b border-line px-4 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1" onClick={() => nav(`/client/${client.id}/program/${p.id}`)}>
                      <div className="truncate text-[15px]">{p.name}</div>
                      <div className="text-xs text-muted">{p.days.length} дн.</div>
                    </div>
                    <IconButton className="h-9 w-9 text-muted" onClick={() => setMenuFor(p)}>
                      <IconMore size={20} />
                    </IconButton>
                  </div>
                ))}
              </Card>
            </Section>
          )}

          <Button variant="ghost" block className="mt-3" onClick={newProgram}>
            <IconPlus size={18} /> Новая программа
          </Button>
        </>
      )}

      <Sheet open={pick} onClose={() => setPick(false)} title="Какую тренировку начинаем?">
        <div className="space-y-2">
          {active?.days.map((d) => (
            <Card key={d.id} className="p-4" onClick={() => begin(d.id)}>
              <div className="font-semibold">{d.name || 'День'}</div>
              <div className="mt-0.5 line-clamp-2 text-sm text-muted">
                {d.exercises.map((e) => e.name).filter(Boolean).join(', ') || 'Нет упражнений'}
              </div>
            </Card>
          ))}
          <Card className="p-4" onClick={() => begin(null)}>
            <div className="font-semibold">Свободная тренировка</div>
            <div className="mt-0.5 text-sm text-muted">Без программы — упражнения добавишь по ходу</div>
          </Card>
        </div>
      </Sheet>

      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name}
        actions={
          menuFor
            ? [
                { label: 'Изменить', onClick: () => nav(`/client/${client.id}/program/${menuFor.id}`) },
                ...(!menuFor.active
                  ? [
                      {
                        label: 'Сделать текущей',
                        onClick: async () => {
                          await db.transaction('rw', db.programs, async () => {
                            for (const p of programs) await db.programs.update(p.id, { active: p.id === menuFor.id })
                          })
                          toast('Программа стала текущей')
                        },
                      },
                    ]
                  : []),
                {
                  label: 'Сделать копию',
                  onClick: async () => {
                    const copy: Program = {
                      ...menuFor,
                      ...stamp(),
                      name: menuFor.name + ' (копия)',
                      active: false,
                      days: menuFor.days.map((d) => ({ ...d, id: uid(), exercises: d.exercises.map((e) => ({ ...e, id: uid() })) })),
                    }
                    await db.programs.add(copy)
                    toast('Копия создана')
                  },
                },
                {
                  label: 'Удалить программу',
                  danger: true,
                  onClick: () => deleteProgram(menuFor),
                },
              ]
            : []
        }
      />
    </div>
  )
}
