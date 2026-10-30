import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, rememberExercise, uid, type PlanExercise, type Program, type ProgramDay } from '../db'
import { ActionSheet, Button, Card, Field, IconButton, NumField, TextArea, TopBar, confirmAsk, cx } from '../components/ui'
import { IconMore, IconPlus } from '../components/icons'

const newExercise = (): PlanExercise => ({
  id: uid(),
  name: '',
  sets: 3,
  reps: '8-12',
  weight: null,
  rir: '2',
  rest: '',
  note: '',
})

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const a = [...arr]
  ;[a[i], a[j]] = [a[j], a[i]]
  return a
}

const cell =
  'w-full rounded-lg border border-line bg-surface-2 px-2 py-2.5 text-center text-[16px] outline-none tabular focus:border-accent-text'

export default function ProgramEditor() {
  const { id = '', programId = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Program | null>(null)
  const [dayMenu, setDayMenu] = useState<string | null>(null)
  const [exMenu, setExMenu] = useState<{ dayId: string; exId: string } | null>(null)
  const catalog = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const saveTimer = useRef<number | undefined>(undefined)
  const latest = useRef<Program | null>(null)

  useEffect(() => {
    db.programs.get(programId).then((x) => setP(x ?? null))
  }, [programId])

  // сохраняем при уходе со страницы
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
      if (latest.current) db.programs.put(latest.current)
    },
    [],
  )

  const update = (fn: (p: Program) => Program) => {
    setP((cur) => {
      if (!cur) return cur
      const next = { ...fn(cur), updatedAt: Date.now() }
      latest.current = next
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => db.programs.put(next), 300)
      return next
    })
  }

  const updDay = (dayId: string, fn: (d: ProgramDay) => ProgramDay) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? fn(d) : d)) }))

  const updEx = (dayId: string, exId: string, patch: Partial<PlanExercise>) =>
    updDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }))

  if (p === null) return <TopBar title="Программа" back />

  const letters = 'ABCDEFGH'
  const menuDay = p.days.find((d) => d.id === dayMenu)
  const menuExObj = exMenu ? p.days.find((d) => d.id === exMenu.dayId)?.exercises.find((e) => e.id === exMenu.exId) : undefined
  const menuEx = exMenu && menuExObj ? { dayId: exMenu.dayId, ex: menuExObj } : null

  return (
    <div className="pb-28">
      <TopBar title="Программа" subtitle="Сохраняется автоматически" back />
      <datalist id="exercise-list">
        {(catalog ?? []).map((e) => (
          <option key={e.id} value={e.name} />
        ))}
      </datalist>

      <div className="space-y-3 px-4 pt-4">
        <Field label="Название программы" value={p.name} onChange={(e) => update((x) => ({ ...x, name: e.target.value }))} />
        <TextArea
          label="Заметки к программе"
          minRows={1}
          value={p.notes}
          placeholder="Цель блока, сроки, на что обратить внимание"
          onChange={(e) => update((x) => ({ ...x, notes: e.target.value }))}
        />
      </div>

      {p.days.map((d, di) => (
        <div key={d.id} className="mt-6 px-4">
          <div className="mb-2 flex items-center gap-1">
            <input
              value={d.name}
              onChange={(e) => updDay(d.id, (x) => ({ ...x, name: e.target.value }))}
              placeholder="Название дня"
              className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-lg font-semibold text-accent-text outline-none focus:bg-surface-2"
            />
            <IconButton className="h-9 w-9 text-muted" onClick={() => setDayMenu(d.id)}>
              <IconMore size={20} />
            </IconButton>
          </div>

          <div className="space-y-2.5">
            {d.exercises.map((e, ei) => (
              <Card key={e.id} className="p-3">
                <div className="flex items-center gap-1">
                  <span className="w-6 shrink-0 text-center text-sm text-muted tabular">{ei + 1}</span>
                  <input
                    list="exercise-list"
                    value={e.name}
                    autoFocus={!e.name}
                    placeholder="Упражнение"
                    onChange={(ev) => updEx(d.id, e.id, { name: ev.target.value })}
                    onBlur={(ev) => rememberExercise(ev.target.value)}
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-2 text-[16px] font-medium outline-none focus:bg-surface-2"
                  />
                  <IconButton className="h-9 w-9 text-muted" onClick={() => setExMenu({ dayId: d.id, exId: e.id })}>
                    <IconMore size={20} />
                  </IconButton>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Подходы', 'sets'],
                    ['Повторы', 'reps'],
                    ['Вес, кг', 'weight'],
                    ['RIR', 'rir'],
                  ].map(([label]) => (
                    <div key={label} className="text-[11px] font-medium text-muted">
                      {label}
                    </div>
                  ))}
                  <NumField integer value={e.sets} onChange={(v) => updEx(d.id, e.id, { sets: v })} inputClassName={cell} />
                  <input className={cell} inputMode="text" value={e.reps} onChange={(ev) => updEx(d.id, e.id, { reps: ev.target.value })} placeholder="8-12" />
                  <NumField value={e.weight} onChange={(v) => updEx(d.id, e.id, { weight: v })} inputClassName={cell} />
                  <input className={cell} inputMode="decimal" value={e.rir} onChange={(ev) => updEx(d.id, e.id, { rir: ev.target.value })} placeholder="1-2" />
                </div>

                <div className="mt-2 grid grid-cols-[96px_1fr] items-start gap-2">
                  <input
                    className={cx(cell, 'text-left')}
                    value={e.rest}
                    placeholder="Отдых"
                    onChange={(ev) => updEx(d.id, e.id, { rest: ev.target.value })}
                  />
                  <TextArea
                    minRows={1}
                    value={e.note}
                    placeholder="Заметка: техника, темп…"
                    onChange={(ev) => updEx(d.id, e.id, { note: ev.target.value })}
                    className="[&_textarea]:rounded-lg [&_textarea]:bg-surface-2 [&_textarea]:px-2 [&_textarea]:py-2.5"
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button
            variant="soft"
            block
            className="mt-2.5"
            onClick={() => updDay(d.id, (x) => ({ ...x, exercises: [...x.exercises, newExercise()] }))}
          >
            <IconPlus size={20} /> Упражнение в «{d.name || `День ${letters[di] ?? di + 1}`}»
          </Button>
        </div>
      ))}

      <div className="mt-8 px-4">
        <Button
          block
          onClick={() =>
            update((x) => ({
              ...x,
              days: [...x.days, { id: uid(), name: `День ${letters[x.days.length] ?? x.days.length + 1}`, exercises: [] }],
            }))
          }
        >
          <IconPlus size={20} /> Добавить тренировочный день
        </Button>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur-md">
        <div className="mx-auto max-w-xl px-4 py-3">
          <Button
            variant="primary"
            size="lg"
            block
            onClick={async () => {
              window.clearTimeout(saveTimer.current)
              if (latest.current) await db.programs.put(latest.current)
              for (const d of p.days) for (const e of d.exercises) await rememberExercise(e.name)
              nav(`/client/${id}?tab=program`, { replace: true })
            }}
          >
            Готово
          </Button>
        </div>
      </div>

      <ActionSheet
        open={!!menuEx}
        onClose={() => setExMenu(null)}
        title={menuEx?.ex.name || 'Упражнение'}
        actions={
          menuEx
            ? [
                {
                  label: 'Переместить выше',
                  onClick: () => updDay(menuEx.dayId, (x) => ({ ...x, exercises: move(x.exercises, x.exercises.findIndex((y) => y.id === menuEx.ex.id), -1) })),
                },
                {
                  label: 'Переместить ниже',
                  onClick: () => updDay(menuEx.dayId, (x) => ({ ...x, exercises: move(x.exercises, x.exercises.findIndex((y) => y.id === menuEx.ex.id), 1) })),
                },
                {
                  label: 'Сделать копию',
                  onClick: () =>
                    updDay(menuEx.dayId, (x) => {
                      const i = x.exercises.findIndex((y) => y.id === menuEx.ex.id)
                      const a = [...x.exercises]
                      a.splice(i + 1, 0, { ...menuEx.ex, id: uid() })
                      return { ...x, exercises: a }
                    }),
                },
                {
                  label: 'Удалить упражнение',
                  danger: true,
                  onClick: () =>
                    (!menuEx.ex.name || confirmAsk(`Убрать «${menuEx.ex.name}» из программы?`)) &&
                    updDay(menuEx.dayId, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.id !== menuEx.ex.id) })),
                },
              ]
            : []
        }
      />

      <ActionSheet
        open={!!menuDay}
        onClose={() => setDayMenu(null)}
        title={menuDay?.name}
        actions={
          menuDay
            ? [
                {
                  label: 'Сделать копию дня',
                  onClick: () =>
                    update((x) => ({
                      ...x,
                      days: [
                        ...x.days,
                        { ...menuDay, id: uid(), name: menuDay.name + ' (копия)', exercises: menuDay.exercises.map((e) => ({ ...e, id: uid() })) },
                      ],
                    })),
                },
                {
                  label: 'Переместить выше',
                  onClick: () => update((x) => ({ ...x, days: move(x.days, x.days.indexOf(menuDay), -1) })),
                },
                {
                  label: 'Переместить ниже',
                  onClick: () => update((x) => ({ ...x, days: move(x.days, x.days.indexOf(menuDay), 1) })),
                },
                {
                  label: 'Удалить день',
                  danger: true,
                  onClick: () =>
                    confirmAsk(`Удалить «${menuDay.name}» со всеми упражнениями?`) &&
                    update((x) => ({ ...x, days: x.days.filter((y) => y.id !== menuDay.id) })),
                },
              ]
            : []
        }
      />
    </div>
  )
}
