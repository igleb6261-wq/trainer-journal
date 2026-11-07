import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteClientCascade } from '../db'
import { Avatar } from '../components/media'
import { IslandTabs, type IslandItem } from '../components/IslandTabs'
import { ActionSheet, Button, Card, IconButton, TopBar, confirmAsk, toast } from '../components/ui'
import {
  IconArchive,
  IconCamera,
  IconClipboard,
  IconClock,
  IconDumbbell,
  IconEdit,
  IconFlag,
  IconMore,
  IconPin,
  IconPlay,
  IconRuler,
  IconTrash,
} from '../components/icons'
import { isStale } from '../lib/schedule'
import { finishWorkout } from '../lib/workout'
import { ageFrom, daysAgo, fullName, plural } from '../lib/format'
import ProfileTab from './client/ProfileTab'
import ProgramTab from './client/ProgramTab'
import HistoryTab from './client/HistoryTab'
import MeasurementsTab from './client/MeasurementsTab'
import PhotosTab from './client/PhotosTab'

const TABS = [
  { key: 'profile', label: 'Анкета', icon: IconClipboard, anim: 'wiggle' },
  { key: 'program', label: 'Программа', icon: IconDumbbell, anim: 'lift' },
  { key: 'history', label: 'История', icon: IconClock, anim: 'tick' },
  { key: 'measure', label: 'Замеры', icon: IconRuler, anim: 'slide' },
  { key: 'photos', label: 'Фото', icon: IconCamera, anim: 'pop' },
] as const satisfies readonly IslandItem<string>[]
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
        {/* компактная шапка: аватар слева, цель и статистика рядом */}
        <div className="flex items-center gap-3">
          <Avatar client={client} size={52} />
          <div className="min-w-0 flex-1">
            {client.goal ? (
              <div className="line-clamp-2 text-[15px] leading-snug">{client.goal}</div>
            ) : (
              <div className="text-[15px] text-muted">Цель не указана</div>
            )}
            <div className="mt-0.5 text-[13px] text-muted">
              {done.length} {plural(done.length, 'тренировка', 'тренировки', 'тренировок')}
              {last && ` · последняя ${daysAgo(last.date)}`}
            </div>
          </div>
          {client.pinned && <IconPin size={16} className="shrink-0 text-muted" />}
        </div>

        {active &&
          (isStale(active) ? (
            <Card className="mt-3 border-down/40 bg-down-soft p-4">
              <div className="font-semibold text-down">Незавершённая тренировка</div>
              <div className="mt-0.5 text-sm text-muted">
                {active.dayName || 'Свободная тренировка'} · начата {daysAgo(active.date)}. Её забыли завершить?
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" variant="primary" onClick={async () => {
                  await finishWorkout(active)
                  toast('Тренировка сохранена в истории')
                }}>
                  Завершить
                </Button>
                <Button size="sm" onClick={() => nav(`/client/${id}/workout/${active.id}`)}>
                  Открыть
                </Button>
                <Button size="sm" variant="danger" onClick={async () => {
                  if (!confirmAsk('Удалить незавершённую тренировку?')) return
                  await db.workouts.delete(active.id)
                  toast('Тренировка удалена')
                }}>
                  Удалить
                </Button>
              </div>
            </Card>
          ) : (
            <Card
              className="mt-3 flex items-center gap-3 border-accent-text/40 bg-accent-soft p-3.5"
              onClick={() => nav(`/client/${id}/workout/${active.id}`)}
            >
              <IconPlay size={20} className="text-accent-text" />
              <div className="flex-1">
                <div className="font-semibold text-accent-text">Идёт тренировка</div>
                <div className="text-sm text-muted">{active.dayName || 'Свободная тренировка'} — нажми, чтобы продолжить</div>
              </div>
            </Card>
          ))}

        {last?.nextNote.trim() && (
          <Card className="mt-3 border-note/30 bg-note-soft px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-note">
              <IconFlag size={14} /> Задача с прошлой тренировки · {daysAgo(last.date)}
            </div>
            <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-[15px] leading-snug">{last.nextNote}</div>
          </Card>
        )}
      </div>

      {/* вкладки — овальный островок; по бокам отступ, чтобы ползунок прокрутки его не задевал */}
      <div className="pointer-events-none sticky top-0 z-20 mt-2 px-3 pb-2 pt-2">
        <IslandTabs
          items={TABS}
          active={tab}
          className="pointer-events-auto"
          onSelect={(k) => setSp({ tab: k }, { replace: true })}
        />
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
            label: client.pinned ? 'Открепить' : 'Закрепить вверху списка',
            icon: <IconPin size={20} />,
            onClick: async () => {
              await db.clients.update(id, { pinned: !client.pinned, updatedAt: Date.now() })
              toast(client.pinned ? 'Клиент откреплён' : 'Клиент закреплён')
            },
          },
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
