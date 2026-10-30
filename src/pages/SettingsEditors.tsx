import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_METRICS, DEFAULT_QUESTIONS, exKey, setSetting, stamp, uid, type Metric, type Question } from '../db'
import { Button, Card, IconButton, TopBar, confirmAsk, cx, toast } from '../components/ui'
import { IconArrowDown, IconArrowUp, IconPlus, IconSearch, IconTrash } from '../components/icons'
import { useMetrics, useQuestions } from '../lib/hooks'

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const a = [...arr]
  ;[a[i], a[j]] = [a[j], a[i]]
  return a
}

const smallInput =
  'w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-2 text-[16px] outline-none focus:border-line focus:bg-surface-2'

/* ---------------- Вопросы анкеты ---------------- */

export function QuestionsEditor() {
  const stored = useQuestions()
  const [list, setList] = useState<Question[] | null>(null)
  useEffect(() => {
    if (stored && list === null) setList(stored)
  }, [stored, list])

  const save = async (next: Question[]) => {
    setList(next)
    await setSetting('questions', next)
  }

  if (!list) return <TopBar title="Вопросы анкеты" back />
  return (
    <div className="pb-10">
      <TopBar title="Вопросы анкеты" back />
      <div className="px-4 pt-3">
        <p className="px-1 pb-3 text-sm text-muted">
          Эти вопросы показываются в анкете каждого клиента. Изменения сохраняются сразу.
        </p>
        <Card className="overflow-hidden">
          {list.map((q, i) => (
            <div key={q.id} className="flex items-center gap-1 border-b border-line px-2 py-1 last:border-b-0">
              <input
                className={smallInput}
                value={q.text}
                onChange={(e) => save(list.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))}
              />
              <IconButton className="h-9 w-9 text-muted" onClick={() => save(move(list, i, -1))} disabled={i === 0}>
                <IconArrowUp size={18} />
              </IconButton>
              <IconButton className="h-9 w-9 text-muted" onClick={() => save(move(list, i, 1))} disabled={i === list.length - 1}>
                <IconArrowDown size={18} />
              </IconButton>
              <IconButton
                className="h-9 w-9 text-danger"
                onClick={() => confirmAsk(`Удалить вопрос «${q.text}»?`) && save(list.filter((x) => x.id !== q.id))}
              >
                <IconTrash size={18} />
              </IconButton>
            </div>
          ))}
        </Card>
        <Button variant="soft" block className="mt-3" onClick={() => save([...list, { id: uid(), text: 'Новый вопрос' }])}>
          <IconPlus size={20} /> Добавить вопрос
        </Button>
        <Button
          variant="ghost"
          block
          className="mt-2"
          onClick={() => confirmAsk('Вернуть стандартный список вопросов? Ответы клиентов не удалятся.') && save(DEFAULT_QUESTIONS)}
        >
          Вернуть стандартный список
        </Button>
      </div>
    </div>
  )
}

/* ---------------- Показатели замеров ---------------- */

export function MetricsEditor() {
  const stored = useMetrics()
  const [list, setList] = useState<Metric[] | null>(null)
  useEffect(() => {
    if (stored && list === null) setList(stored)
  }, [stored, list])

  const save = async (next: Metric[]) => {
    setList(next)
    await setSetting('metrics', next)
  }

  if (!list) return <TopBar title="Показатели замеров" back />
  return (
    <div className="pb-10">
      <TopBar title="Показатели замеров" back />
      <div className="px-4 pt-3">
        <p className="px-1 pb-3 text-sm text-muted">
          Скрытые показатели не показываются в таблице и форме, но старые значения сохраняются.
        </p>
        <Card className="overflow-hidden">
          {list.map((m, i) => (
            <div key={m.key} className={cx('flex items-center gap-1 border-b border-line px-2 py-1 last:border-b-0', m.hidden && 'opacity-50')}>
              <input
                className={smallInput}
                value={m.label}
                onChange={(e) => save(list.map((x) => (x.key === m.key ? { ...x, label: e.target.value } : x)))}
              />
              <input
                className={cx(smallInput, 'w-14 shrink-0 text-center text-muted')}
                value={m.unit}
                onChange={(e) => save(list.map((x) => (x.key === m.key ? { ...x, unit: e.target.value } : x)))}
              />
              <button
                className={cx(
                  'h-8 shrink-0 rounded-lg px-2 text-xs font-medium',
                  m.hidden ? 'bg-surface-2 text-muted' : 'bg-accent-soft text-accent-text',
                )}
                onClick={() => save(list.map((x) => (x.key === m.key ? { ...x, hidden: !x.hidden } : x)))}
              >
                {m.hidden ? 'скрыт' : 'виден'}
              </button>
              <IconButton className="h-9 w-9 text-muted" onClick={() => save(move(list, i, -1))} disabled={i === 0}>
                <IconArrowUp size={18} />
              </IconButton>
              <IconButton className="h-9 w-9 text-muted" onClick={() => save(move(list, i, 1))} disabled={i === list.length - 1}>
                <IconArrowDown size={18} />
              </IconButton>
            </div>
          ))}
        </Card>
        <Button
          variant="soft"
          block
          className="mt-3"
          onClick={() => save([...list, { key: 'm_' + uid().slice(0, 8), label: 'Новый показатель', unit: 'см', hidden: false }])}
        >
          <IconPlus size={20} /> Добавить показатель
        </Button>
        <Button
          variant="ghost"
          block
          className="mt-2"
          onClick={() => {
            if (!confirmAsk('Вернуть стандартный список показателей? Свои показатели станут скрытыми, значения не удалятся.')) return
            const custom = list.filter((m) => !DEFAULT_METRICS.some((d) => d.key === m.key)).map((m) => ({ ...m, hidden: true }))
            save([...DEFAULT_METRICS, ...custom])
          }}
        >
          Вернуть стандартный список
        </Button>
      </div>
    </div>
  )
}

/* ---------------- Справочник упражнений ---------------- */

export function ExercisesEditor() {
  const all = useLiveQuery(() => db.exercises.toArray(), [])
  const [q, setQ] = useState('')
  const [name, setName] = useState('')

  const list = useMemo(() => {
    const s = exKey(q)
    return (all ?? []).filter((e) => !s || e.key.includes(s)).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [all, q])

  const add = async () => {
    const n = name.trim()
    if (!n) return
    const key = exKey(n)
    if (await db.exercises.where('key').equals(key).first()) {
      toast('Такое упражнение уже есть')
      return
    }
    await db.exercises.add({ ...stamp(), name: n, key })
    setName('')
  }

  return (
    <div className="pb-10">
      <TopBar title="Справочник упражнений" subtitle={all ? `${all.length} шт.` : undefined} back />
      <div className="px-4 pt-3">
        <p className="px-1 pb-3 text-sm text-muted">
          Упражнения попадают сюда автоматически из программ. Их названия подсказываются при вводе — так не будет дублей
          вроде «Жим лежа» и «Жим лёжа».
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Новое упражнение"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-[16px] outline-none focus:border-accent-text"
          />
          <Button variant="primary" onClick={add}>
            <IconPlus size={20} />
          </Button>
        </div>
        <div className="relative mt-3">
          <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3.5 text-[16px] outline-none focus:border-accent-text"
          />
        </div>
        {list.length > 0 && (
          <Card className="mt-3 overflow-hidden">
            {list.map((e) => (
              <div key={e.id} className="flex items-center gap-1 border-b border-line px-2 py-1 last:border-b-0">
                <input
                  className={smallInput}
                  defaultValue={e.name}
                  onBlur={async (ev) => {
                    const n = ev.target.value.trim()
                    if (n && n !== e.name) await db.exercises.update(e.id, { name: n, key: exKey(n), updatedAt: Date.now() })
                  }}
                />
                <IconButton
                  className="h-9 w-9 text-danger"
                  onClick={() => confirmAsk(`Удалить «${e.name}» из справочника? В тренировках оно останется.`) && db.exercises.delete(e.id)}
                >
                  <IconTrash size={18} />
                </IconButton>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
