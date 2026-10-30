import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteClientCascade } from '../db'
import { Avatar } from '../components/media'
import { ActionSheet, Card, IconButton, TopBar, confirmAsk, cx, toast } from '../components/ui'
import { IconArchive, IconEdit, IconFlag, IconMore, IconPlay, IconTrash } from '../components/icons'
import { ageFrom, daysAgo, fullName, plural } from '../lib/format'
import ProfileTab from './client/ProfileTab'
import ProgramTab from './client/ProgramTab'
import HistoryTab from './client/HistoryTab'
import MeasurementsTab from './client/MeasurementsTab'
import PhotosTab from './client/PhotosTab'

const TABS = [
  { key: 'profile', label: 'Анкета' },
  { key: 'program', label: 'Программа' },
  { key: 'history', label: 'История' },
  { key: 'measure', label: 'Замеры' },
  { key: 'photos', label: 'Фото' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function ClientPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as TabKey) || 'program'
  const [menu, setMenu] = useState(false)

  const client = useLiveQuery(() => db.clients.get(id), [id])
  const workouts = useLiveQuery(
    () => db.workouts.where('clientId').equals(id).toArray(),
    [id],
  )

  if (client === undefined || workouts === undefined) return <TopBar title="" back="/" />
  if (client === null || !client) return <TopBar title="Клиент не найден" back="/" />

  const active = workouts.find((w) => w.status === 'active')
  const done = workouts
    .filter((w) => w.status === 'done')
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
  const last = done[0]
  const age = ageFrom(client.birthDate)

  const sub = [
    age !== null ? `${age} ${plural(age, 'год', 'года', 'лет')}` : null,
    client.height ? `${client.height} см` : null,
    client.weight ? `${String(client.weight).replace('.', ',')} кг` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <TopBar
        title={fullName(client)}
        subtitle={sub || undefined}
        back="/"
        right={
          <IconButton onClick={() => setMenu(true)} aria-label="Ещё">
            <IconMore />
          </IconButton>
        }
      />

      <div className="px-4 pt-3">
        <div className="flex items-center gap-3">
          <Avatar client={client} size={56} />
          <div className="min-w-0 flex-1 text-sm text-muted">
            {client.goal ? <div className="line-clamp-2 text-ink">{client.goal}</div> : <div>Цель не указана</div>}
            <div className="mt-0.5">
              {done.length} {plural(done.length, 'тренировка', 'тренировки', 'тренировок')}
              {last && ` · последняя ${daysAgo(last.date)}`}
            </div>
          </div>
        </div>

        {active && (
          <Card
            className="mt-3 flex items-center gap-3 border-accent-text/40 bg-accent-soft p-4"
            onClick={() => nav(`/client/${id}/workout/${active.id}`)}
          >
            <IconPlay size={20} className="text-accent-text" />
            <div className="flex-1">
              <div className="font-semibold text-accent-text">Идёт тренировка</div>
              <div className="text-sm text-muted">{active.dayName || 'Свободная тренировка'} — нажми, чтобы продолжить</div>
            </div>
          </Card>
        )}

        {last?.nextNote.trim() && (
          <Card className="mt-3 border-note/30 bg-note-soft p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-note">
              <IconFlag size={15} /> Задача с прошлой тренировки
            </div>
            <div className="mt-1 whitespace-pre-wrap text-[15px]">{last.nextNote}</div>
            <div className="mt-1 text-xs text-muted">от {daysAgo(last.date)}</div>
          </Card>
        )}
      </div>

      <div className="no-scrollbar sticky top-0 z-20 mt-3 flex gap-1 overflow-x-auto border-b border-line bg-bg px-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSp({ tab: t.key }, { replace: true })}
            className={cx(
              'relative shrink-0 px-3 py-3 text-[15px] font-medium',
              tab === t.key ? 'text-ink' : 'text-muted',
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-accent" />}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {tab === 'profile' && <ProfileTab client={client} />}
        {tab === 'program' && <ProgramTab client={client} activeWorkoutId={active?.id} />}
        {tab === 'history' && <HistoryTab client={client} />}
        {tab === 'measure' && <MeasurementsTab client={client} />}
        {tab === 'photos' && <PhotosTab client={client} />}
      </div>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={fullName(client)}
        actions={[
          { label: 'Редактировать данные', icon: <IconEdit size={20} />, onClick: () => nav(`/client/${id}/edit`) },
          {
            label: client.archived ? 'Вернуть из архива' : 'Перенести в архив',
            icon: <IconArchive size={20} />,
            onClick: async () => {
              await db.clients.update(id, { archived: !client.archived, updatedAt: Date.now() })
              toast(client.archived ? 'Клиент возвращён' : 'Клиент в архиве')
            },
          },
          {
            label: 'Удалить клиента',
            icon: <IconTrash size={20} />,
            danger: true,
            onClick: async () => {
              if (!confirmAsk(`Удалить ${fullName(client)} и ВСЕ его данные (тренировки, замеры, фото)? Это нельзя отменить.`)) return
              await deleteClientCascade(id)
              toast('Клиент удалён')
              nav('/', { replace: true })
            },
          },
        ]}
      />
    </div>
  )
}
