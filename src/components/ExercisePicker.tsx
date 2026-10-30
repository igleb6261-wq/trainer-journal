import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exKey, type ExerciseRef } from '../db'
import { GROUP_NAMES, LIB_INDEX, groupOf } from '../lib/library'
import { Button, Sheet, cx } from './ui'
import { IconCheck, IconPlus, IconSearch } from './icons'

/**
 * Выбор упражнений из библиотеки: группы мышц, поиск, своё упражнение.
 * multi — можно отметить несколько и добавить разом.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  title,
  exclude = [],
  multi = false,
}: {
  open: boolean
  onClose: () => void
  onPick: (names: string[]) => void
  title: string
  exclude?: string[]
  multi?: boolean
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const catalog = useLiveQuery(() => db.exercises.toArray(), [])

  useEffect(() => {
    if (open) {
      setQ('')
      setPicked([])
    }
  }, [open])

  const s = exKey(q)
  const available = useMemo(
    () => (catalog ?? []).filter((e) => !exclude.includes(e.key)).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [catalog, exclude],
  )
  const groups = GROUP_NAMES.filter((g) => available.some((e) => groupOf(e) === g))

  // порядок внутри группы — как в библиотеке (базовые первыми), свои — по алфавиту в конце
  const inGroup = (g: string) =>
    available
      .filter((e) => groupOf(e) === g)
      .sort((a, b) => (LIB_INDEX.get(a.key) ?? 999) - (LIB_INDEX.get(b.key) ?? 999))

  const exact = (catalog ?? []).some((e) => e.key === s)

  const choose = (name: string) => {
    if (!multi) {
      onPick([name])
      return
    }
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]))
  }

  const Item = ({ e, showGroup }: { e: ExerciseRef; showGroup?: boolean }) => {
    const on = picked.includes(e.name)
    return (
      <button
        className={cx(
          'flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 active:bg-surface-2',
          on && 'bg-accent-soft',
        )}
        onClick={() => choose(e.name)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[16px] leading-snug">{e.name}</div>
          {showGroup && <div className="text-[12px] text-muted">{groupOf(e)}</div>}
        </div>
        {multi && (
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
              on ? 'border-accent bg-accent text-accent-ink' : 'border-line text-transparent',
            )}
          >
            <IconCheck size={16} />
          </span>
        )}
      </button>
    )
  }

  const list = s ? available.filter((e) => e.key.includes(s)) : null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        multi && picked.length > 0 ? (
          <Button variant="primary" size="lg" block onClick={() => onPick(picked)}>
            Добавить ({picked.length})
          </Button>
        ) : undefined
      }
    >
      <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 pb-2">
        <div className="relative">
          <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск упражнения"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3.5 text-[16px] outline-none focus:border-accent-text"
          />
        </div>
        {!s && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
            {[null, ...groups].map((g) => (
              <button
                key={g ?? 'all'}
                onClick={() => setGroup(g)}
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium',
                  group === g ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
                )}
              >
                {g ?? 'Все'}
              </button>
            ))}
          </div>
        )}
      </div>

      {q.trim() && !exact && (
        <Button
          variant="soft"
          block
          className="mt-1"
          onClick={() => {
            const name = q.trim()
            if (multi) {
              setPicked((p) => (p.includes(name) ? p : [...p, name]))
              setQ('')
            } else onPick([name])
          }}
        >
          <IconPlus size={20} /> Своё упражнение: «{q.trim()}»
        </Button>
      )}

      {multi && picked.some((n) => !(catalog ?? []).some((e) => e.name === n)) && (
        <div className="mt-2 text-sm text-muted">
          Свои: {picked.filter((n) => !(catalog ?? []).some((e) => e.name === n)).join(', ')}
        </div>
      )}

      {list ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((e) => (
            <Item key={e.id} e={e} showGroup />
          ))}
          {list.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted">Ничего не нашлось — добавь как своё</div>}
        </div>
      ) : (
        (group ? [group] : groups).map((g) => (
          <div key={g} className="mt-3">
            <div className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{g}</div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {inGroup(g).map((e) => (
                <Item key={e.id} e={e} />
              ))}
            </div>
          </div>
        ))
      )}
    </Sheet>
  )
}
