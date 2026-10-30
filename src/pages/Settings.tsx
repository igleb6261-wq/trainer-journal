import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Button, Card, Row, Section, Segmented, TopBar, confirmAsk, toast } from '../components/ui'
import { IconChevron, IconDownload, IconUpload } from '../components/icons'
import { exportBackup, importBackup, markBackupDone, shareOrDownload } from '../lib/backup'
import { daysAgo, plural } from '../lib/format'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { deleteDemo, loadDemo } from '../lib/demo'

export default function Settings() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const [busy, setBusy] = useState<string | null>(null)

  const info = useLiveQuery(async () => {
    const last = (await db.settings.get('lastBackupAt'))?.value as number | undefined
    const clients = await db.clients.toArray()
    return {
      last,
      clients: clients.length,
      demo: clients.filter((c) => c.demo).length,
      workouts: await db.workouts.count(),
      photos: await db.photos.count(),
    }
  }, [])

  const [storage, setStorage] = useState<string | null>(null)
  if (storage === null && navigator.storage?.estimate) {
    navigator.storage.estimate().then((e) => {
      const mb = (e.usage ?? 0) / 1024 / 1024
      setStorage(mb < 1 ? '< 1 МБ' : `${mb.toFixed(1).replace('.', ',')} МБ`)
    })
  }

  const doExport = async () => {
    setBusy('export')
    try {
      const file = await exportBackup()
      const r = await shareOrDownload(file)
      if (r !== 'cancelled') {
        await markBackupDone()
        toast(r === 'shared' ? 'Копия готова' : 'Файл копии скачан')
      }
    } catch (e) {
      toast('Ошибка: ' + (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const doImport = async (f: File) => {
    if (!confirmAsk('Восстановить данные из этого файла? ВСЕ текущие данные в приложении будут заменены данными из копии.')) return
    setBusy('import')
    try {
      const r = await importBackup(f)
      toast(`Восстановлено: ${r.clients} ${plural(r.clients, 'клиент', 'клиента', 'клиентов')}`)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const lastText = info?.last
    ? daysAgo(new Date(info.last).toISOString().slice(0, 10))
    : 'ещё не делалась'

  return (
    <div>
      <TopBar title="Настройки" />
      <div className="px-4 pb-8">
        <Section title="Резервная копия">
          <Card className="p-4">
            <div className="text-sm text-muted">
              Все данные хранятся только в этом телефоне. Делай копию раз в неделю и отправляй файл себе в Telegram
              «Избранное» или на почту.
            </div>
            <div className="mt-3 text-sm">
              Последняя копия: <b>{lastText}</b>
            </div>
            {info && (
              <div className="mt-1 text-xs text-muted">
                В базе: {info.clients} {plural(info.clients, 'клиент', 'клиента', 'клиентов')}, {info.workouts}{' '}
                {plural(info.workouts, 'тренировка', 'тренировки', 'тренировок')}, {info.photos} фото
                {storage && ` · занято ${storage}`}
              </div>
            )}
            <Button variant="primary" block className="mt-4" onClick={doExport} disabled={!!busy}>
              <IconDownload size={20} /> {busy === 'export' ? 'Готовлю файл…' : 'Сделать резервную копию'}
            </Button>
            <Button block className="mt-2" onClick={() => fileRef.current?.click()} disabled={!!busy}>
              <IconUpload size={20} /> {busy === 'import' ? 'Восстанавливаю…' : 'Восстановить из копии'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) doImport(f)
              }}
            />
          </Card>
        </Section>

        <Section title="Шаблоны">
          <Card className="overflow-hidden">
            <Row label="Вопросы анкеты" onClick={() => nav('/settings/questions')} right={<IconChevron size={18} className="text-muted" />} />
            <Row label="Показатели замеров" onClick={() => nav('/settings/metrics')} right={<IconChevron size={18} className="text-muted" />} />
            <Row label="Справочник упражнений" onClick={() => nav('/settings/exercises')} right={<IconChevron size={18} className="text-muted" />} />
          </Card>
        </Section>

        <Section title="Оформление">
          <Segmented<Theme>
            value={theme}
            onChange={(t) => {
              setTheme(t)
              setThemeState(t)
            }}
            options={[
              { value: 'auto', label: 'Как в телефоне' },
              { value: 'dark', label: 'Тёмная' },
              { value: 'light', label: 'Светлая' },
            ]}
          />
        </Section>

        <Section title="Демо-данные">
          <Card className="p-4">
            <div className="text-sm text-muted">
              Вымышленные клиенты с тренировками и замерами — чтобы потрогать приложение. Твои настоящие данные не
              затрагиваются.
            </div>
            {info && info.demo > 0 ? (
              <Button
                variant="danger"
                block
                className="mt-3"
                onClick={async () => {
                  if (!confirmAsk('Удалить всех демо-клиентов?')) return
                  await deleteDemo()
                  toast('Демо-данные удалены')
                }}
              >
                Удалить демо-данные
              </Button>
            ) : (
              <Button
                block
                className="mt-3"
                onClick={async () => {
                  await loadDemo()
                  toast('Демо-данные загружены')
                  nav('/')
                }}
              >
                Загрузить демо-данные
              </Button>
            )}
          </Card>
        </Section>

        <div className="mt-8 text-center text-xs text-muted">Журнал тренера · версия {__APP_VERSION__}</div>
      </div>
    </div>
  )
}
