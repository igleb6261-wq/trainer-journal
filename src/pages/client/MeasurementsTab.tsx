import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, stamp, type Client, type Measurement, type Metric } from '../../db'
import { Button, Card, Empty, Field, NumField, Section, Sheet, TextArea, confirmAsk, cx, toast } from '../../components/ui'
import { IconPlus } from '../../components/icons'
import { LineChart } from '../../components/LineChart'
import { useMetrics } from '../../lib/hooks'
import { fmtDateLong, fmtDateShort, num, todayISO } from '../../lib/format'
import { BodyFigure } from '../../components/BodyFigure'
import { MEASURE_GUIDE, MEASURE_RULES, shortLabel } from '../../lib/measureGuide'

type Draft = { id: string | null; date: string; values: Record<string, number | null>; note: string }

const diffText = (d: number) => (d > 0 ? `+${num(d, 1)}` : num(d, 1))

export default function MeasurementsTab({ client }: { client: Client }) {
  const metrics = useMetrics()
  const rows = useLiveQuery(
    async () =>
      (await db.measurements.where('clientId').equals(client.id).toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [client.id],
  )
  const [draft, setDraft] = useState<Draft | null>(null)
  const [chartKey, setChartKey] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)

  const visible = useMemo(() => (metrics ?? []).filter((m) => !m.hidden), [metrics])
  // показываем столбцы только тех показателей, где есть хоть одно значение
  const used = useMemo(() => visible.filter((m) => (rows ?? []).some((r) => r.values[m.key] !== undefined)), [visible, rows])

  if (!metrics || !rows) return null

  const openNew = () => setDraft({ id: null, date: todayISO(), values: {}, note: '' })
  const openEdit = (r: Measurement) => setDraft({ id: r.id, date: r.date, values: { ...r.values }, note: r.note })

  const lastVal = (key: string) => rows.find((r) => r.values[key] !== undefined)?.values[key]

  const save = async () => {
    if (!draft) return
    const values: Record<string, number> = {}
    for (const [k, v] of Object.entries(draft.values)) if (v !== null && v !== undefined) values[k] = v
    if (!Object.keys(values).length) {
      toast('Внеси хотя бы одно значение')
      return
    }
    if (draft.id) {
      await db.measurements.update(draft.id, { date: draft.date, values, note: draft.note, updatedAt: Date.now() })
    } else {
      await db.measurements.add({ ...stamp(), clientId: client.id, date: draft.date, values, note: draft.note })
    }
    // обновляем текущий вес клиента по самому свежему замеру
    const all = await db.measurements.where('clientId').equals(client.id).toArray()
    const latestW = all.filter((m) => m.values.weight !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (latestW) await db.clients.update(client.id, { weight: latestW.values.weight, updatedAt: Date.now() })
    setDraft(null)
    toast('Замер сохранён')
  }

  // для разницы с прошлым замером — ищем предыдущее значение показателя
  const prevValue = (idx: number, key: string) => {
    for (let i = idx + 1; i < rows.length; i++) if (rows[i].values[key] !== undefined) return rows[i].values[key]
    return undefined
  }
  const firstValue = (key: string) => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].values[key] !== undefined) return rows[i].values[key]
    return undefined
  }

  const chartMetric: Metric | undefined = used.find((m) => m.key === chartKey) ?? used[0]
  const chartPoints = chartMetric
    ? [...rows]
        .reverse()
        .filter((r) => r.values[chartMetric.key] !== undefined)
        .map((r) => ({ label: fmtDateShort(r.date).slice(0, 5), value: r.values[chartMetric.key] }))
    : []

  return (
    <div>
      <Button variant="primary" block size="lg" className="mt-4" onClick={openNew}>
        <IconPlus size={20} /> Новый замер
      </Button>

      {rows.length === 0 ? (
        <Empty title="Замеров пока нет" text="Вес и обхваты будут собираться в таблицу с датами и разницей." />
      ) : (
        <>
          <Section title={`Последний замер · ${fmtDateLong(rows[0].date)}`}>
            <div className="grid grid-cols-2 gap-2">
              {used.map((m) => {
                const l = lastVal(m.key)
                const f = firstValue(m.key)
                const idx = rows.findIndex((r) => r.values[m.key] !== undefined)
                const p = idx >= 0 ? prevValue(idx, m.key) : undefined
                const dPrev = l !== undefined && p !== undefined ? l - p : undefined
                const dFirst = l !== undefined && f !== undefined && rows.length > 1 ? l - f : undefined
                return (
                  <Card key={m.key} className="px-3 py-2.5" onClick={() => setChartKey(m.key)}>
                    <div className="truncate text-[12px] text-muted">{shortLabel(m)}</div>
                    <div className="text-[20px] font-semibold tabular">
                      {l !== undefined ? num(l, 1) : '—'} <span className="text-[13px] font-normal text-muted">{m.unit}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] tabular text-muted">
                      {dPrev !== undefined && dPrev !== 0 && <span>{dPrev > 0 ? '↑' : '↓'} {diffText(dPrev)} к прошлому</span>}
                      {dFirst !== undefined && dFirst !== 0 && <span className="text-accent-text">{diffText(dFirst)} с начала</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
            <Button variant="ghost" block className="mt-1" onClick={() => setShowTable((x) => !x)}>
              {showTable ? 'Скрыть таблицу' : `Показать таблицу всех замеров (${rows.length})`}
            </Button>
          </Section>

          {showTable && (
          <Section title="Таблица замеров">
            <Card className="overflow-hidden">
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-max min-w-full border-collapse text-[14px] tabular">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left text-[12px] font-semibold text-muted">Дата</th>
                      {used.map((m) => (
                        <th key={m.key} className="min-w-16 max-w-24 whitespace-normal px-3 py-2.5 text-right align-top text-[12px] font-semibold leading-tight text-muted">
                          {shortLabel(m)}
                          <div className="font-normal">{m.unit}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line">
                      <td className="sticky left-0 z-10 bg-surface px-3 py-2 text-[12px] font-semibold text-accent-text">С начала</td>
                      {used.map((m) => {
                        const f = firstValue(m.key)
                        const l = lastVal(m.key)
                        const d = f !== undefined && l !== undefined ? l - f : undefined
                        return (
                          <td key={m.key} className="px-3 py-2 text-right text-[13px] font-semibold text-accent-text">
                            {d !== undefined && rows.length > 1 ? diffText(d) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                    {rows.map((r, idx) => (
                      <tr key={r.id} className="cursor-pointer border-b border-line last:border-b-0 active:bg-surface-2" onClick={() => openEdit(r)}>
                        <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium">
                          {fmtDateShort(r.date)}
                          {r.note && <div className="max-w-24 truncate text-[11px] font-normal text-muted">{r.note}</div>}
                        </td>
                        {used.map((m) => {
                          const v = r.values[m.key]
                          const p = prevValue(idx, m.key)
                          const d = v !== undefined && p !== undefined ? v - p : undefined
                          return (
                            <td key={m.key} className="px-3 py-2 text-right">
                              {v !== undefined ? num(v, 1) : <span className="text-muted">—</span>}
                              {d !== undefined && d !== 0 && (
                                <div className="text-[11px] text-muted">
                                  {d > 0 ? '↑' : '↓'} {diffText(d)}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="px-1 pt-2 text-xs text-muted">Листай таблицу вбок. Нажми на строку, чтобы изменить замер.</div>
          </Section>
          )}

          {used.length > 0 && (
            <Section title="График">
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
                {used.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setChartKey(m.key)}
                    className={cx(
                      'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium',
                      chartMetric?.key === m.key ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {shortLabel(m)}
                  </button>
                ))}
              </div>
              <Card className="p-3">
                <LineChart points={chartPoints} unit={chartMetric?.unit} />
              </Card>
            </Section>
          )}
        </>
      )}

      <Sheet
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Изменить замер' : 'Новый замер'}
        footer={
          <div className="flex gap-2">
            {draft?.id && (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!draft.id || !confirmAsk('Удалить этот замер?')) return
                  await db.measurements.delete(draft.id)
                  setDraft(null)
                  toast('Замер удалён')
                }}
              >
                Удалить
              </Button>
            )}
            <Button variant="primary" size="lg" className="flex-1" onClick={save}>
              Сохранить
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-3">
            <Field label="Дата" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            {draft.date && <div className="-mt-1 px-1 text-xs text-muted">{fmtDateLong(draft.date)}</div>}
            <RulesCard />
            <div className="space-y-2">
              {visible.map((m) => {
                const last = lastVal(m.key)
                return (
                  <MetricRow
                    key={m.key}
                    metric={m}
                    last={last !== undefined && !draft.id ? num(last, 1) : null}
                    value={draft.values[m.key] ?? null}
                    onChange={(v) => setDraft((d) => (d ? { ...d, values: { ...d.values, [m.key]: v } } : d))}
                  />
                )
              })}
            </div>
            <TextArea label="Заметка" minRows={1} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Например: утром натощак" />
          </div>
        )}
      </Sheet>
    </div>
  )
}

/** Общие правила замеров — сворачиваемая карточка */
function RulesCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card className="px-3.5 py-3">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((x) => !x)}>
        <span className="text-[15px] font-medium">Как мерить правильно</span>
        <span className="text-[14px] text-accent-text">{open ? 'Скрыть' : 'Показать'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 text-[14px] leading-snug">
          {MEASURE_RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="shrink-0 text-up">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Поле ввода, заметное на фоне карточки */
const INPUT =
  'w-full rounded-xl border border-line bg-surface-2 py-2.5 pl-3 pr-10 text-right text-[17px] font-semibold tabular text-ink outline-none placeholder:font-normal placeholder:text-muted/60 focus:border-accent-text'

/** Строка показателя: мини-фигура с местом замера, название, поле. По нажатию — подробная подсказка */
function MetricRow({
  metric,
  value,
  onChange,
  last,
}: {
  metric: Metric
  value: number | null
  onChange: (v: number | null) => void
  last: string | null
}) {
  const guide = MEASURE_GUIDE[metric.key]
  const [open, setOpen] = useState(false)
  const toggle = () => guide && setOpen((x) => !x)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-2.5 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={guide ? `Как мерить: ${metric.label}` : undefined}
          className={cx('flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg/60', guide && 'active:opacity-60')}
        >
          {guide ? <BodyFigure zone={guide.zone} mini className="h-[46px] w-[46px]" /> : <span className="text-[20px] text-muted">📏</span>}
        </button>
        <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left">
          <div className="text-[15px] font-medium leading-tight">{metric.label}</div>
          <div className="mt-0.5 text-[13px]">
            {guide && <span className="text-accent-text">{open ? 'Скрыть подсказку' : 'Как мерить'}</span>}
            {guide && last && <span className="text-muted"> · </span>}
            {last && <span className="text-muted tabular">было {last}</span>}
          </div>
        </button>
        <NumField
          className="w-[108px] shrink-0"
          inputClassName={cx(INPUT, open && 'border-accent-text')}
          suffix={metric.unit}
          placeholder="0"
          value={value}
          onChange={onChange}
        />
      </div>
      {open && guide && (
        <div className="anim-fade border-t border-line px-3 pb-3.5 pt-3">
          {/* слева — вся фигура (где на теле), справа — крупно само место замера */}
          <div className="flex gap-2">
            <div className="flex w-[100px] shrink-0 items-center justify-center rounded-xl bg-bg/50 py-2">
              <BodyFigure zone={guide.zone} className="h-[214px] w-[94px]" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-bg/50 p-1">
              <BodyFigure zone={guide.zone} zoom className="aspect-square w-full max-w-[230px]" />
            </div>
          </div>
          <div className="mt-3 text-[14px] leading-snug">
            <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Где</div>
            <div>{guide.where}</div>
            <div className="mb-0.5 mt-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Как мерить</div>
            <ol className="space-y-1">
              {guide.how.map((h, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="w-3.5 shrink-0 font-semibold tabular text-accent-text">{i + 1}.</span>
                  <span>{h}</span>
                </li>
              ))}
            </ol>
            {guide.tip && <div className="mt-2.5 rounded-lg bg-accent-soft px-2.5 py-2 text-[13px]">{guide.tip}</div>}
          </div>
        </div>
      )}
      {open && guide && (
        <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
          <div className="flex-1 text-[15px] font-medium">Запиши результат</div>
          <NumField
            className="w-[140px] shrink-0"
            inputClassName={cx(INPUT, 'border-accent-text')}
            suffix={metric.unit}
            placeholder="0"
            value={value}
            onChange={onChange}
          />
        </div>
      )}
    </Card>
  )
}
