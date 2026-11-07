/**
 * Схематичная фигура человека (вид спереди) с отмеченным местом замера:
 * сантиметровая лента — синяя дуга вокруг нужной части тела.
 */
import { useId } from 'react'
import type { MeasureZone } from '../lib/measureGuide'

/** Контур тела без рук (симметричный), рост ≈ 8 голов */
const BODY =
  'M 91 50 C 91 62 90 70 86 76 C 78 80 66 82 57 86 C 49 90 48 102 52 110 C 56 114 64 112 69 114 C 71 128 75 142 76 155 C 77 168 67 180 66 196 C 65 230 70 270 74 302 C 75 312 70 328 72 345 C 74 370 80 392 81 404 C 81 410 74 414 75 418 C 76 423 92 423 94 418 C 94 410 92 400 93 392 C 95 365 96 340 93 318 C 91 300 96 250 99 216 L 100 214 L 101 216 C 104 250 109 300 107 318 C 104 340 105 365 107 392 C 108 400 106 410 106 418 C 108 423 124 423 125 418 C 126 414 119 410 119 404 C 120 392 126 370 128 345 C 130 328 125 312 126 302 C 130 270 135 230 134 196 C 133 180 123 168 124 155 C 125 142 129 128 131 114 C 136 112 144 114 148 110 C 152 102 151 90 143 86 C 134 82 122 80 114 76 C 110 70 109 62 109 50 Z'
const ARM =
  'M 56 87 C 47 93 45 108 46 122 C 46 138 44 150 43 160 C 42 178 40 196 40 210 C 39 222 38 238 43 246 C 47 250 51 246 51 238 C 51 228 50 218 49 210 C 50 196 54 178 56 162 C 58 148 62 128 66 114 C 64 104 60 92 56 87 Z'
const MIRROR = 'translate(200 0) scale(-1 1)'

export function BodyFigure({ zone, mini = false, className }: { zone?: MeasureZone; mini?: boolean; className?: string }) {
  // в маленькой картинке показываем увеличенный фрагмент тела вокруг места замера
  const box = mini && zone ? zone.crop : ([0, 0, 200, 452] as const)
  const k = box[2] / 46 // единиц рисунка на 1 px маленькой картинки
  const sw = mini ? 2.6 * k : 3.2
  const bands = zone?.bands ?? []
  const gid = useId()
  return (
    <svg viewBox={box.join(' ')} className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" style={{ stopColor: 'var(--fig)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--fig-hi)' }} />
          <stop offset="1" style={{ stopColor: 'var(--fig)' }} />
        </linearGradient>
      </defs>
      {/* задняя половина ленты — за телом, видна только по краям */}
      {bands.map((b, i) => (
          <path
            key={'b' + i}
            d={`M ${b.cx - b.rx} ${b.cy} A ${b.rx} ${b.ry ?? 4.5} 0 0 1 ${b.cx + b.rx} ${b.cy}`}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.45}
            strokeWidth={mini ? 1.4 * k : 2}
            strokeDasharray={mini ? `${2 * k} ${2 * k}` : "3 3"}
          />
        ))}
      {zone?.scale && (
        <g>
          <rect x="58" y="413" width="84" height="24" rx="7" fill="var(--accent)" fillOpacity={mini ? 0.9 : 0.85} />
          {!mini && <rect x="88" y="428" width="24" height="5" rx="2" fill="var(--bg)" fillOpacity={0.6} />}
        </g>
      )}
      <g fill={`url(#${gid})`}>
        <ellipse cx="100" cy="33" rx="17" ry="22" />
        <path d={BODY} />
        <path d={ARM} />
        <path d={ARM} transform={MIRROR} />
      </g>
      {zone?.dot && <circle cx={zone.dot[0]} cy={zone.dot[1]} r={mini ? 2 * k : 3} fill="var(--accent)" />}
      {/* передняя половина ленты */}
      {bands.map((b, i) => (
        <g key={'f' + i}>
          <path
            d={`M ${b.cx - b.rx} ${b.cy} A ${b.rx} ${b.ry ?? 4.5} 0 0 0 ${b.cx + b.rx} ${b.cy}`}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.25}
            strokeWidth={mini ? 6 * k : 9}
            strokeLinecap="round"
          />
          <path
            d={`M ${b.cx - b.rx} ${b.cy} A ${b.rx} ${b.ry ?? 4.5} 0 0 0 ${b.cx + b.rx} ${b.cy}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* где правая, где левая сторона клиента (вид спереди — зеркально) */}
      {zone?.side && !mini && (
        <g fontSize="15" fontWeight="600" fill="var(--muted)" textAnchor="middle">
          <text x="24" y="270">П</text>
          <text x="176" y="270">Л</text>
        </g>
      )}
    </svg>
  )
}
