import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Avatar } from '../components/media'
import { Button, Card, Empty, IconButton, Segmented, TopBar, cx, toast } from '../components/ui'
import { IconCalendar, IconChevron, IconPin, IconPlay, IconPlus, IconSearch } from '../components/icons'
import { daysAgo, fmtDate, fullName, plural, todayISO } from '../lib/format'
import { clientBadges, slotOn } from '../lib/schedule'
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
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || fullName(a).localeCompare(fullName(b), 'ru'))
  }, [clients, q, view])

  const todayList = useMemo(
    () =>
      (clients ?? [])
        .filter((c) => !c.archived && slotOn(c, todayISO()) !== null)
        .sort((a, b) => (slotOn(a, todayISO()) || '99').localeCompare(slotOn(b, todayISO()) || '99')),
    [clients],
  )

  const archivedCount = (clients ?? []).filter((c) => c.archived).length

  if (!clients) return <TopBar title="Мои клиенты" />

  return (
    <div>
      <TopBar
        title="Мои клиенты"
        subtitle={`${list.length} ${plural(list.length, 'клиент', 'клиента', 'клиентов')}`}
        right={
          clients.length > 0 && (
            <IconButton className="text-accent-text" onClick={() => nav('/client/new')} aria-label="Новый клиент">
              <IconPlus size={28} />
            </IconButton>
          )
        }
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

        {todayList.length > 0 && view === 'active' && !q && (
          <Card className="mb-3 flex items-center gap-3 px-3.5 py-3" onClick={() => nav('/today')}>
            <IconCalendar size={22} className="shrink-0 text-accent-text" />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">
                Сегодня {todayList.length} {plural(todayList.length, 'тренировка', 'тренировки', 'тренировок')}
              </div>
              <div className="truncate text-[13px] text-muted">
                {todayList.map((c) => `${slotOn(c, todayISO()) || ''} ${c.firstName || c.lastName}`.trim()).join(' · ')}
              </div>
            </div>
            <IconChevron size={18} className="text-muted" />
          </Card>
        )}

        {clients.length > 0 && (
          <div className="relative">
            <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени"
              className="w-full rounded-xl border border-transparent bg-surface py-3 pl-10 pr-3.5 text-[16px] outline-none placeholder:text-muted/60 focus:border-accent-text"
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
          <div className="-mx-4 mt-3 bg-surface">
            {list.map((c, i) => {
              const info = lastByClient.get(c.id)
              const badges = clientBadges(c, info?.last, info?.count ?? 0)
              return (
                <div
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 pl-3 active:bg-surface-2"
                  onClick={() => nav(`/client/${c.id}`)}
                >
                  <Avatar client={c} size={56} />
                  <div className={cx('min-w-0 flex-1 py-2.5 pr-4', i < list.length - 1 && 'border-b border-line')}>
                    <div className="flex items-baseline gap-2">
                      <div className="min-w-0 flex-1 truncate text-[16px] font-semibold">{fullName(c)}</div>
                      {c.pinned && <IconPin size={14} className="shrink-0 self-center text-muted" />}
                      {info?.last && <div className="shrink-0 text-[13px] text-muted">{fmtDate(info.last)}</div>}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[15px] leading-snug text-muted">
                      {info?.active ? (
                        <span className="inline-flex items-center gap-1 text-accent-text">
                          <IconPlay size={11} /> идёт тренировка
                        </span>
                      ) : info?.last ? (
                        `Последняя тренировка ${daysAgo(info.last)}`
                      ) : (
                        'Тренировок ещё не было'
                      )}
                      {c.goal && <span> · {c.goal}</span>}
                    </div>
                    {(badges.length > 0 || c.demo) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.demo && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">демо</span>}
                        {badges.map((b) => (
                          <span
                            key={b.text}
                            className={cx(
                              'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                              b.tone === 'accent' && 'bg-accent-soft text-accent-text',
                              b.tone === 'muted' && 'bg-surface-2 text-muted',
                              b.tone === 'down' && 'bg-down-soft text-down',
                              b.tone === 'danger' && 'bg-danger-soft text-danger',
                            )}
                          >
                            {b.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
