import { num } from '../lib/format'

/** Простой линейный график без библиотек */
export function LineChart({
  points,
  unit,
  height = 180,
}: {
  points: { label: string; value: number }[]
  unit?: string
  height?: number
}) {
  if (points.length < 2)
    return <div className="py-8 text-center text-sm text-muted">Для графика нужно минимум две записи</div>

  const W = 340
  const H = height
  const padL = 52
  const padR = 12
  const padT = 14
  const padB = 26
  const vals = points.map((p) => p.value)
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1)
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB)

  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`
  const labelEvery = Math.ceil(points.length / 5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
            {num(t, 1)}
            {i === 2 && unit ? ` ${unit}` : ''}
          </text>
        </g>
      ))}
      <path d={area} fill="var(--accent-soft)" />
      <path d={path} fill="none" stroke="var(--accent-text)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--bg)" stroke="var(--accent-text)" strokeWidth={2} />
          {(i % labelEvery === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
