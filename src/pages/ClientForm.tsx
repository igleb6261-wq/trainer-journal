import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, stamp, type Client, type Format, type Sex } from '../db'
import { Button, Field, NumField, Segmented, Select, TextArea, TopBar, toast, BottomBar } from '../components/ui'
import { todayISO } from '../lib/format'

const empty = (): Omit<Client, 'id' | 'createdAt' | 'updatedAt'> => ({
  lastName: '',
  firstName: '',
  middleName: '',
  birthDate: '',
  sex: '',
  phone: '',
  contact: '',
  goal: '',
  format: 'offline',
  startDate: todayISO(),
  height: null,
  weight: null,
  notes: '',
  answers: {},
  avatarPhotoId: null,
  archived: false,
})

export default function ClientForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [f, setF] = useState(empty())
  const [loaded, setLoaded] = useState(!id)

  useEffect(() => {
    if (!id) return
    db.clients.get(id).then((c) => {
      if (c) setF(c)
      setLoaded(true)
    })
  }, [id])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const save = async () => {
    if (!f.firstName.trim() && !f.lastName.trim()) {
      toast('Введи хотя бы имя или фамилию')
      return
    }
    const clean = {
      ...f,
      lastName: f.lastName.trim(),
      firstName: f.firstName.trim(),
      middleName: f.middleName.trim(),
    }
    if (id) {
      await db.clients.update(id, { ...clean, updatedAt: Date.now() })
      nav(-1)
    } else {
      const c: Client = { ...clean, ...stamp() }
      await db.clients.add(c)
      nav(`/client/${c.id}`, { replace: true })
    }
  }

  if (!loaded) return <TopBar title="..." back />

  return (
    <div className="pb-24">
      <TopBar title={id ? 'Редактировать' : 'Новый клиент'} back />
      <div className="space-y-3 px-4 pt-4">
        <Field label="Фамилия" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} autoCapitalize="words" />
        <Field label="Имя" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} autoCapitalize="words" />
        <Field label="Отчество" value={f.middleName} onChange={(e) => set('middleName', e.target.value)} autoCapitalize="words" />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Дата рождения"
            type="date"
            className="min-w-0"
            value={f.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
          />
          <Select<Sex>
            label="Пол"
            className="min-w-0"
            value={f.sex}
            onChange={(v) => set('sex', v)}
            placeholder="Выбрать"
            options={[
              { value: 'm', label: 'Мужской' },
              { value: 'f', label: 'Женский' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Рост" suffix="см" value={f.height} onChange={(v) => set('height', v)} />
          <NumField label="Вес" suffix="кг" value={f.weight} onChange={(v) => set('weight', v)} />
        </div>

        <Field label="Телефон" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        <Field
          label="Telegram / Instagram"
          value={f.contact}
          onChange={(e) => set('contact', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="@username"
        />

        <div>
          <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">Формат</div>
          <Segmented<Format>
            value={f.format}
            onChange={(v) => set('format', v)}
            options={[
              { value: 'offline', label: 'Офлайн' },
              { value: 'online', label: 'Онлайн' },
              { value: 'mixed', label: 'Смешанный' },
            ]}
          />
        </div>

        <Field label="Начало работы" type="date" className="min-w-0" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
        <TextArea label="Цель" value={f.goal} onChange={(e) => set('goal', e.target.value)} placeholder="Например: −8 кг, подтянуть ягодицы, убрать боль в спине" />
        <TextArea label="Заметки о клиенте" value={f.notes} onChange={(e) => set('notes', e.target.value)} minRows={3} />
      </div>

      <BottomBar>
        <div className="mx-auto max-w-xl px-4 py-3">
          <Button variant="primary" size="lg" block onClick={save}>
            {id ? 'Сохранить' : 'Создать клиента'}
          </Button>
        </div>
      </BottomBar>
    </div>
  )
}
