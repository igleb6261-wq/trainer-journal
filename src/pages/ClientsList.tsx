import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Avatar } from '../components/media'
import { Button, Card, Empty, Fab, Segmented, TopBar, toast } from '../components/ui'
import { IconChevron, IconPlay, IconPlus, IconSearch } from '../components/icons'
import { daysAgo, fullName, plural } from '../lib/format'
import { loadDemo } from '../lib/demo'
import { useBackupReminder } from '../lib/hooks'

export default function ClientsList() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const backupDue = useBackupReminder()

  const lastByClient = useMemo(() => {
    const m = new Map<string, { last?: string; active?: string; count: number }>()
    for (const w of workouts ?? []) {
      const e = m.get(w.clientId) ?? { count: 0 }
      if (w.status === 'active') e.active = w.id
      else {
        e.count++
        if (!e.last || w.date > e.last) e.last = w.date
      }
      m.set(w.clientId, e)
    }
    return m
  }, [workouts])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (clients ?? [])
      .filter((c) => (view === 'archived' ? c.archived : !c.archived))
      .filter((c) => !s || fullName(c).toLowerCase().includes(s) || c.contact.toLowerCase().includes(s))
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'ru'))
  }, [clients, q, view])

  const archivedCount = (clients ?? []).filter((c) => c.archived).length

  if (!clients) return <TopBar title="Мои клиенты" />

  return (
    <div>
      <TopBar
        title="Мои клиенты"
        subtitle={`${list.length} ${plural(list.length, 'клиент', 'клиента', 'клиентов')}`}
      />
      <div className="px-4 pt-3">
        {backupDue && clients.length > 0 && (
          <Card className="mb-3 border-down/40 bg-down-soft p-4" onClick={() => nav('/settings')}>
            <div className="text-[15px] font-semibold text-down">Пора сделать резервную копию</div>
            <div className="mt-0.5 text-sm text-muted">
              Данные хранятся только в этом телефоне. Нажми, чтобы сохранить копию.
            </div>
          </Card>
        )}

        {clients.length > 0 && (
          <div className="relative">
            <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени"
              className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3.5 text-[16px] outline-none placeholder:text-muted/60 focus:border-accent-text"
            />
          </div>
        )}

        {archivedCount > 0 && (
          <Segmented
            className="mt-3"
            value={view}
            onChange={setView}
            options={[
              { value: 'active', label: 'Текущие' },
              { value: 'archived', label: `Архив (${archivedCount})` },
            ]}
          />
        )}

        {clients.length === 0 ? (
          <Empty
            title="Пока нет клиентов"
            text="Добавь первого клиента или загрузи демо-данные, чтобы посмотреть, как всё работает."
            action={
              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={() => nav('/client/new')}>
                  <IconPlus size={20} /> Новый клиент
                </Button>
                <Button
                  onClick={async () => {
                    await loadDemo()
                    toast('Демо-данные загружены')
                  }}
                >
                  Загрузить демо-данные
                </Button>
              </div>
            }
          />
        ) : list.length === 0 ? (
          <Empty title="Никого не нашлось" />
        ) : (
          <Card className="mt-3 overflow-hidden">
            {list.map((c) => {
              const info = lastByClient.get(c.id)
              return (
                <div
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-surface-2"
                  onClick={() => nav(`/client/${c.id}`)}
                >
                  <Avatar client={c} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-medium">
                      {fullName(c)}
                      {c.demo && <span className="ml-1.5 text-xs text-muted">демо</span>}
                    </div>
                    <div className="truncate text-[13px] text-muted">
                      {info?.active ? (
                        <span className="inline-flex items-center gap-1 font-medium text-accent-text">
                          <IconPlay size={11} /> идёт тренировка
                        </span>
                      ) : info?.last ? (
                        `Последняя тренировка: ${daysAgo(info.last)}`
                      ) : (
                        'Тренировок ещё не было'
                      )}
                    </div>
                  </div>
                  <IconChevron size={18} className="text-muted" />
                </div>
              )
            })}
          </Card>
        )}
      </div>
      {clients.length > 0 && view === 'active' && (
        <Fab onClick={() => nav('/client/new')} label="Клиент" icon={<IconPlus size={20} />} />
      )}
    </div>
  )
}
