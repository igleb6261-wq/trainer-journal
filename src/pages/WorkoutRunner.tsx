import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey, rememberExercise, type SetEntry, type Workout, type WorkoutExercise } from '../db'
import { ActionSheet, Button, Card, IconButton, NumField, Sheet, TextArea, TopBar, confirmAsk, cx, toast, BottomBar } from '../components/ui'
import { IconCheck, IconFlag, IconMore, IconPlus, IconSearch, IconTrash } from '../components/icons'
import { daysAgo, fmtDate, fmtDateLong, fullName, weekday } from '../lib/format'
import { findPrevious, setsLine } from '../lib/summary'
import { buildExercise, emptySet } from '../lib/workout'

const sortDesc = (a: Workout, b: Workout) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))

const cell =
  'w-full rounded-lg border border-line bg-surface-2 px-1 py-2.5 text-center text-[17px] font-medium outline-none tabular focus:border-accent-text'

export default function WorkoutRunner() {
  const { id = '', workoutId = '' } = useParams()
  const nav = useNavigate()
  const [w, setW] = useState<Workout | null | undefined>(undefined)
  const [menu, setMenu] = useState(false)
  const [exMenu, setExMenu] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'replace'; exId: string } | null>(null)
  const [dateEdit, setDateEdit] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const latest = useRef<Workout | null>(null)

  const client = useLiveQuery(() => db.clients.get(id), [id])
  const history = useLiveQuery(async () => (await db.workouts.where('clientId').equals(id).toArray()).sort(sortDesc), [id])

  useEffect(() => {
    db.workouts.get(workoutId).then((x) => setW(x ?? null))
  }, [workoutId])

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
      if (latest.current) db.workouts.put(latest.current)
    },
    [],
  )

  const update = (fn: (w: Workout) => Workout) => {
    setW((cur) => {
      if (!cur) return cur
      const next = { ...fn(cur), updatedAt: Date.now() }
      latest.current = next
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => db.workouts.put(next), 250)
      return next
    })
  }
  const updEx = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === exId ? fn(e) : e)) }))
  const updSet = (exId: string, setId: string, patch: Partial<SetEntry>) =>
    updEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))

  const prevNote = useMemo(() => {
    if (!w || !history) return null
    const prev = history.find(
      (h) => h.id !== w.id && h.status === 'done' && (h.date < w.date || (h.date === w.date && h.createdAt < w.createdAt)),
    )
    return prev?.nextNote.trim() ? prev : null
  }, [w, history])

  if (w === undefined || client === undefined) return <TopBar title="Тренировка" back />
  if (w === null || !client) return <TopBar title="Тренировка не найдена" back />

  const isDone = w.status === 'done'
  const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)

  const flush = async () => {
    window.clearTimeout(saveTimer.current)
    if (latest.current) await db.workouts.put(latest.current)
  }

  const finish = async () => {
    if (!isDone && doneSets < totalSets) {
      if (!confirmAsk(`Отмечено ${doneSets} из ${totalSets} подходов. Завершить тренировку?`)) return
    }
    const final: Workout = { ...w, status: 'done', finishedAt: w.finishedAt ?? Date.now(), updatedAt: Date.now() }
    latest.current = final
    await flush()
    for (const e of final.exercises) await rememberExercise(e.name)
    toast(isDone ? 'Сохранено' : 'Тренировка сохранена в истории')
    nav(`/client/${id}?tab=history`, { replace: true })
  }

  const addExercise = async (name: string) => {
    const ex = await buildExercise(id, { name })
    if (picker?.mode === 'replace') {
      const exId = picker.exId
      update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === exId ? { ...ex, comment: e.comment } : e)) }))
    } else {
      update((w) => ({ ...w, exercises: [...w.exercises, ex] }))
    }
    rememberExercise(name)
    setPicker(null)
  }

  const menuEx = w.exercises.find((e) => e.id === exMenu)

  return (
    <div className="pb-24">
      <TopBar
        title={w.dayName || 'Свободная тренировка'}
        subtitle={
          <span>
            {fullName(client)} · <button className="underline decoration-dotted" onClick={() => setDateEdit(true)}>{fmtDate(w.date)}, {weekday(w.date)}</button>
          </span>
        }
        back
        right={
          <IconButton onClick={() => setMenu(true)}>
            <IconMore />
          </IconButton>
        }
      />

      {/* прогресс */}
      {!isDone && totalSets > 0 && (
        <div className="h-1 bg-surface-2">
          <div className="h-1 bg-accent transition-all" style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
      )}

      <div className="px-4 pt-3">
        {isDone && (
          <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
            Редактирование завершённой тренировки. Изменения сохраняются автоматически.
          </div>
        )}

        {prevNote && (
          <Card className="mb-3 border-note/30 bg-note-soft p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-note">
              <IconFlag size={15} /> Задача с прошлой тренировки
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[15px]">{prevNote.nextNote}</div>
            <div className="mt-1 text-xs text-muted">
              {fmtDate(prevNote.date)} · {daysAgo(prevNote.date)}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {w.exercises.map((e, ei) => {
            const prev = history ? findPrevious(e.name, w, history) : null
            const allDone = e.sets.length > 0 && e.sets.every((s) => s.done)
            return (
              <Card key={e.id} className={cx('overflow-hidden', allDone && !isDone && 'border-up/40')}>
                <div className="flex items-start gap-2 px-4 pt-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted tabular">{ei + 1}.</span>
                      <span className="text-[17px] font-semibold leading-snug">{e.name}</span>
                      {allDone && <IconCheck size={16} className="shrink-0 text-up" />}
                    </div>
                    {e.target && <div className="mt-0.5 text-[13px] text-muted tabular">План: {e.target}</div>}
                    {e.planNote && <div className="mt-0.5 text-[13px] italic text-muted">{e.planNote}</div>}
                  </div>
                  <IconButton className="-mr-2 -mt-1 h-9 w-9 text-muted" onClick={() => setExMenu(e.id)}>
                    <IconMore size={20} />
                  </IconButton>
                </div>

                {prev && (
                  <div className="mx-4 mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                    <span className="text-muted">Прошлый раз ({fmtDate(prev.workout.date)}): </span>
                    <span className="tabular">{setsLine(prev.exercise.sets, true)}</span>
                    {prev.exercise.comment && <div className="mt-0.5 italic text-muted">💬 {prev.exercise.comment}</div>}
                  </div>
                )}

                <div className="px-3 pb-1 pt-2">
                  <div className="grid grid-cols-[28px_1fr_1fr_1fr_48px] items-center gap-2 px-1 pb-1 text-center text-[11px] font-medium text-muted">
                    <div>#</div>
                    <div>Вес, кг</div>
                    <div>Повторы</div>
                    <div>Запас</div>
                    <div />
                  </div>
                  {e.sets.map((s, si) => (
                    <div
                      key={s.id}
                      className={cx(
                        'mb-1.5 grid grid-cols-[28px_1fr_1fr_1fr_48px] items-center gap-2 rounded-xl px-1 py-1 transition',
                        s.done && 'bg-up-soft',
                      )}
                    >
                      <div className="text-center text-sm font-medium text-muted tabular">{si + 1}</div>
                      <NumField value={s.weight} onChange={(v) => updSet(e.id, s.id, { weight: v })} inputClassName={cell} />
                      <NumField integer value={s.reps} onChange={(v) => updSet(e.id, s.id, { reps: v })} inputClassName={cell} />
                      <NumField value={s.rir} onChange={(v) => updSet(e.id, s.id, { rir: v })} inputClassName={cell} />
                      <button
                        aria-label="Подход выполнен"
                        onClick={() => updSet(e.id, s.id, { done: !s.done })}
                        className={cx(
                          'flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-90',
                          s.done ? 'border-up bg-up text-bg' : 'border-line bg-surface-2 text-muted',
                        )}
                      >
                        <IconCheck size={22} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pb-2 pt-1">
                    <Button
                      size="sm"
                      variant="soft"
                      className="flex-1"
                      onClick={() => updEx(e.id, (x) => ({ ...x, sets: [...x.sets, emptySet(x.sets[x.sets.length - 1])] }))}
                    >
                      <IconPlus size={16} /> Подход
                    </Button>
                    {e.sets.length > 0 && (
                      <Button
                        size="sm"
                        className="px-4"
                        onClick={() => updEx(e.id, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}
                        aria-label="Удалить последний подход"
                      >
                        <IconTrash size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-line px-3 py-2">
                  <TextArea
                    minRows={1}
                    placeholder="Комментарий к упражнению"
                    value={e.comment}
                    onChange={(ev) => updEx(e.id, (x) => ({ ...x, comment: ev.target.value }))}
                    className="[&_textarea]:border-transparent [&_textarea]:bg-transparent [&_textarea]:px-1 [&_textarea]:py-1.5 [&_textarea]:text-[15px]"
                  />
                </div>
              </Card>
            )
          })}
        </div>

        <Button variant="soft" block className="mt-3" onClick={() => setPicker({ mode: 'add' })}>
          <IconPlus size={20} /> Добавить упражнение
        </Button>

        <div className="mt-6 space-y-3">
          <TextArea
            label="Общий комментарий к тренировке"
            placeholder="Самочувствие, сон, что заметил"
            value={w.comment}
            onChange={(e) => update((x) => ({ ...x, comment: e.target.value }))}
          />
          <TextArea
            label={
              <span className="inline-flex items-center gap-1.5 text-note">
                <IconFlag size={14} /> На следующую тренировку
              </span>
            }
            placeholder="Что подправить, что сделать в следующий раз — покажется в начале следующей тренировки"
            value={w.nextNote}
            onChange={(e) => update((x) => ({ ...x, nextNote: e.target.value }))}
          />
        </div>
      </div>

      <BottomBar>
        <div className="mx-auto max-w-xl px-4 py-3">
          <Button variant="primary" size="lg" block onClick={finish}>
            <IconCheck size={20} /> {isDone ? 'Сохранить' : `Завершить тренировку${totalSets ? ` · ${doneSets}/${totalSets}` : ''}`}
          </Button>
        </div>
      </BottomBar>

      {/* Меню тренировки */}
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Тренировка"
        actions={[
          { label: 'Изменить дату', onClick: () => setDateEdit(true) },
          {
            label: 'Удалить тренировку',
            danger: true,
            onClick: async () => {
              if (!confirmAsk('Удалить эту тренировку со всеми результатами?')) return
              window.clearTimeout(saveTimer.current)
              latest.current = null
              await db.workouts.delete(w.id)
              toast('Тренировка удалена')
              nav(`/client/${id}`, { replace: true })
            },
          },
        ]}
      />

      {/* Меню упражнения */}
      <ActionSheet
        open={!!menuEx}
        onClose={() => setExMenu(null)}
        title={menuEx?.name}
        actions={
          menuEx
            ? [
                { label: 'Заменить упражнение', onClick: () => setPicker({ mode: 'replace', exId: menuEx.id }) },
                {
                  label: 'Переместить выше',
                  onClick: () =>
                    update((x) => {
                      const i = x.exercises.findIndex((e) => e.id === menuEx.id)
                      if (i <= 0) return x
                      const a = [...x.exercises]
                      ;[a[i - 1], a[i]] = [a[i], a[i - 1]]
                      return { ...x, exercises: a }
                    }),
                },
                {
                  label: 'Переместить ниже',
                  onClick: () =>
                    update((x) => {
                      const i = x.exercises.findIndex((e) => e.id === menuEx.id)
                      if (i < 0 || i >= x.exercises.length - 1) return x
                      const a = [...x.exercises]
                      ;[a[i + 1], a[i]] = [a[i], a[i + 1]]
                      return { ...x, exercises: a }
                    }),
                },
                {
                  label: 'Убрать из тренировки',
                  danger: true,
                  onClick: () =>
                    confirmAsk(`Убрать «${menuEx.name}» из этой тренировки?`) &&
                    update((x) => ({ ...x, exercises: x.exercises.filter((e) => e.id !== menuEx.id) })),
                },
              ]
            : []
        }
      />

      <ExercisePicker
        open={!!picker}
        title={picker?.mode === 'replace' ? 'Заменить на…' : 'Добавить упражнение'}
        onClose={() => setPicker(null)}
        onPick={addExercise}
        exclude={w.exercises.map((e) => exKey(e.name))}
      />

      <Sheet
        open={dateEdit}
        onClose={() => setDateEdit(false)}
        title="Дата тренировки"
        footer={
          <Button variant="primary" block size="lg" onClick={() => setDateEdit(false)}>
            Готово
          </Button>
        }
      >
        <input
          type="date"
          value={w.date}
          onChange={(e) => e.target.value && update((x) => ({ ...x, date: e.target.value }))}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[16px] outline-none"
        />
        <div className="mt-2 px-1 text-sm text-muted">{fmtDateLong(w.date)}, {weekday(w.date)}</div>
      </Sheet>
    </div>
  )
}

/* ---------------- Выбор упражнения ---------------- */

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title,
  exclude = [],
}: {
  open: boolean
  onClose: () => void
  onPick: (name: string) => void
  title: string
  exclude?: string[]
}) {
  const [q, setQ] = useState('')
  const catalog = useLiveQuery(() => db.exercises.toArray(), [])
  useEffect(() => {
    if (open) setQ('')
  }, [open])
  const s = exKey(q)
  const list = (catalog ?? [])
    .filter((e) => (!s || e.key.includes(s)) && !exclude.includes(e.key))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .slice(0, 60)
  const exact = (catalog ?? []).some((e) => e.key === s)

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="relative">
        <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Название упражнения"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3.5 text-[16px] outline-none focus:border-accent-text"
        />
      </div>
      {q.trim() && !exact && (
        <Button variant="primary" block className="mt-3" onClick={() => onPick(q.trim())}>
          <IconPlus size={20} /> Добавить «{q.trim()}»
        </Button>
      )}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((e) => (
          <button
            key={e.id}
            className="block w-full border-b border-line px-4 py-3.5 text-left text-[16px] last:border-b-0 active:bg-surface-2"
            onClick={() => onPick(e.name)}
          >
            {e.name}
          </button>
        ))}
        {list.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted">Введи название нового упражнения</div>}
      </div>
    </Sheet>
  )
}
