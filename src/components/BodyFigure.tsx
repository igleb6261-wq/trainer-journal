/**
 * Схематичная фигура человека (вид спереди) с отмеченным местом замера:
 * сантиметровая лента — синяя дуга вокруг нужной части тела.
 */
import type { MeasureZone } from '../lib/measureGuide'

const TORSO_HALF =
  'M 101 74 L 91 75 C 80 77 70 80 62 85 C 53 90 50 101 57 112 C 62 118 66 122 67 130 C 68 148 75 162 75 178 C 75 192 66 202 64 216 L 64 236 L 101 244 Z'
const ARM =
  'M 57 89 C 46 94 41 124 39 156 C 38 172 36 184 34 194 C 31 216 28 240 27 260 L 40 262 C 42 242 46 220 49 198 C 52 180 56 164 58 148 C 60 138 61 130 61 122 Z'
const LEG = 'M 66 206 C 61 240 63 298 70 330 C 66 348 68 372 76 418 L 92 420 C 95 392 98 366 95 336 C 97 310 99 282 100 250 Z'
const MIRROR = 'translate(200 0) scale(-1 1)'

export function BodyFigure({ zone, mini = false, className }: { zone?: MeasureZone; mini?: boolean; className?: string }) {
  // в маленькой картинке показываем увеличенный фрагмент тела вокруг места замера
  const box = mini && zone ? zone.crop : ([0, 0, 200, 452] as const)
  const k = box[2] / 46 // единиц рисунка на 1 px маленькой картинки
  const sw = mini ? 2.6 * k : 3.2
  const bands = zone?.bands ?? []
  return (
    <svg viewBox={box.join(' ')} className={className} aria-hidden>
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
          <rect x="52" y="421" width="96" height="24" rx="7" fill="var(--accent)" fillOpacity={mini ? 0.9 : 0.85} />
          {!mini && <rect x="86" y="436" width="28" height="6" rx="2" fill="var(--bg)" fillOpacity={0.6} />}
        </g>
      )}
      <g fill="var(--fig)">
        <ellipse cx="100" cy="36" rx="19" ry="23" />
        <rect x="90" y="52" width="20" height="28" rx="7" />
        <path d={TORSO_HALF} />
        <path d={TORSO_HALF} transform={MIRROR} />
        <path d={ARM} />
        <path d={ARM} transform={MIRROR} />
        <ellipse cx="33" cy="277" rx="7.5" ry="14" transform="rotate(8 33 277)" />
        <ellipse cx="167" cy="277" rx="7.5" ry="14" transform="rotate(-8 167 277)" />
        <path d={LEG} />
        <path d={LEG} transform={MIRROR} />
        <ellipse cx="82" cy="426" rx="13" ry="7" />
        <ellipse cx="118" cy="426" rx="13" ry="7" />
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
          <text x="14" y="318">П</text>
          <text x="186" y="318">Л</text>
        </g>
      )}
    </svg>
  )
}
