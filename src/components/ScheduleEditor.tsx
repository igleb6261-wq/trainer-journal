import type { ScheduleSlot } from '../db'
import { WD_SHORT, WEEK_ORDER } from '../lib/schedule'
import { cx } from './ui'

/** Выбор дней тренировок и времени */
export function ScheduleEditor({ value, onChange }: { value: ScheduleSlot[]; onChange: (v: ScheduleSlot[]) => void }) {
  const has = (d: number) => value.some((s) => s.day === d)
  const toggle = (d: number) =>
    onChange(has(d) ? value.filter((s) => s.day !== d) : [...value, { day: d, time: value[value.length - 1]?.time ?? '' }])
  const sorted = WEEK_ORDER.filter(has).map((d) => value.find((s) => s.day === d)!)
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={cx(
              'h-11 rounded-xl text-[15px] font-semibold transition',
              has(d) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
            )}
          >
            {WD_SHORT[d]}
          </button>
        ))}
      </div>
      {sorted.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {sorted.map((s) => (
            <label key={s.day} className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-1.5">
              <span className="w-8 text-[15px] font-medium">{WD_SHORT[s.day]}</span>
              <input
                type="time"
                value={s.time}
                onChange={(e) => onChange(value.map((x) => (x.day === s.day ? { ...x, time: e.target.value } : x)))}
                className="min-w-0 flex-1 bg-transparent py-2 text-[16px] outline-none"
              />
              {!s.time && <span className="text-[13px] text-muted">время не указано</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
