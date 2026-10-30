import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type Client } from '../../db'
import { Button, Card, Row, Section, Sheet, TextArea, toast } from '../../components/ui'
import { IconEdit } from '../../components/icons'
import { useQuestions } from '../../lib/hooks'
import { FORMAT_LABEL, SEX_LABEL, ageFrom, fmtDateLong, num } from '../../lib/format'

export default function ProfileTab({ client }: { client: Client }) {
  const nav = useNavigate()
  const questions = useQuestions()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const age = ageFrom(client.birthDate)
  const answered = (questions ?? []).filter((q) => client.answers[q.id]?.trim())
  const known = new Set((questions ?? []).map((q) => q.id))
  const orphans = Object.entries(client.answers).filter(([k, v]) => !known.has(k) && v.trim())

  const openEdit = () => {
    setDraft({ ...client.answers })
    setEdit(true)
  }

  const saveAnswers = async () => {
    await db.clients.update(client.id, { answers: draft, updatedAt: Date.now() })
    setEdit(false)
    toast('Анкета сохранена')
  }

  return (
    <div>
      <Section
        title="Основное"
        action={
          <Button size="sm" variant="ghost" onClick={() => nav(`/client/${client.id}/edit`)}>
            <IconEdit size={16} /> Изменить
          </Button>
        }
      >
        <Card className="overflow-hidden">
          <Row
            label="Дата рождения"
            value={client.birthDate ? `${fmtDateLong(client.birthDate)}${age !== null ? ` (${age})` : ''}` : '—'}
          />
          <Row label="Пол" value={SEX_LABEL[client.sex]} />
          <Row label="Рост" value={client.height ? `${num(client.height)} см` : '—'} />
          <Row label="Вес" value={client.weight ? `${num(client.weight)} кг` : '—'} />
          <Row
            label="Телефон"
            value={client.phone ? <a className="text-accent-text" href={`tel:${client.phone}`}>{client.phone}</a> : '—'}
          />
          <Row label="Telegram / Instagram" value={client.contact || '—'} />
          <Row label="Формат" value={FORMAT_LABEL[client.format]} />
          <Row label="Начало работы" value={client.startDate ? fmtDateLong(client.startDate) : '—'} />
        </Card>
      </Section>

      {client.goal && (
        <Section title="Цель">
          <Card className="whitespace-pre-wrap p-4 text-[15px]">{client.goal}</Card>
        </Section>
      )}

      {client.notes && (
        <Section title="Заметки">
          <Card className="whitespace-pre-wrap p-4 text-[15px]">{client.notes}</Card>
        </Section>
      )}

      <Section
        title={`Анкета · ${answered.length} из ${questions?.length ?? 0}`}
        action={
          <Button size="sm" variant="ghost" onClick={openEdit}>
            <IconEdit size={16} /> Заполнить
          </Button>
        }
      >
        {answered.length === 0 && orphans.length === 0 ? (
          <Card className="p-4 text-sm text-muted">
            Анкета пока не заполнена.
            <Button variant="soft" block className="mt-3" onClick={openEdit}>
              Заполнить анкету
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {answered.map((q) => (
              <div key={q.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="text-[13px] text-muted">{q.text}</div>
                <div className="mt-0.5 whitespace-pre-wrap text-[15px]">{client.answers[q.id]}</div>
              </div>
            ))}
            {orphans.map(([k, v]) => (
              <div key={k} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="text-[13px] text-muted">Вопрос удалён из шаблона</div>
                <div className="mt-0.5 whitespace-pre-wrap text-[15px]">{v}</div>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Sheet
        open={edit}
        onClose={() => setEdit(false)}
        title="Анкета"
        footer={
          <Button variant="primary" size="lg" block onClick={saveAnswers}>
            Сохранить анкету
          </Button>
        }
      >
        <div className="space-y-4">
          {(questions ?? []).map((q) => (
            <TextArea
              key={q.id}
              label={q.text}
              minRows={1}
              value={draft[q.id] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
            />
          ))}
          <div className="px-1 text-xs text-muted">
            Список вопросов меняется в Настройки → Вопросы анкеты.
          </div>
        </div>
      </Sheet>
    </div>
  )
}
