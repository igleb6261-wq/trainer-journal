/**
 * Анатомическая фигура человека (вид спереди) с отмеченным местом замера:
 * сантиметровая лента — синяя дуга вокруг нужной части тела.
 * Рисунок генерируется скриптом scripts/gen-body-art.py.
 */
import { useId, useMemo } from 'react'
import type { MeasureZone } from '../lib/measureGuide'
import { BODY_ART } from './bodyArt'

export function BodyFigure({
  zone,
  mini = false,
  zoom = false,
  className,
}: {
  zone?: MeasureZone
  mini?: boolean // маленькая картинка в списке
  zoom?: boolean // крупный фрагмент в подсказке
  className?: string
}) {
  // фрагмент тела вокруг места замера (для маленькой и крупной картинки)
  const crop = (mini || zoom) && !!zone
  const box = crop ? zone.crop : ([0, 0, 200, 452] as const)
  const k = crop ? box[2] / (mini ? 46 : 170) : 1 // единиц рисунка на 1 px на экране
  const sw = crop ? 2.6 * k : 3.2
  const bands = zone?.bands ?? []
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // у каждой картинки свои id градиентов и масок — иначе они «перепутаются» между картинками
  const art = useMemo(() => ({ __html: BODY_ART.replaceAll('bf-', `bf${uid}-`) }), [uid])
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
            strokeWidth={crop ? 1.4 * k : 2}
            strokeDasharray={crop ? `${2 * k} ${2 * k}` : "3 3"}
          />
        ))}
      {zone?.scale && (
        <g>
          <rect x="58" y="413" width="84" height="24" rx="7" fill="var(--accent)" fillOpacity={mini ? 0.9 : 0.85} />
          {!mini && <rect x="88" y="428" width="24" height="5" rx="2" fill="var(--bg)" fillOpacity={0.6} />}
        </g>
      )}
      <g dangerouslySetInnerHTML={art} />
      {zone?.dot && <circle cx={zone.dot[0]} cy={zone.dot[1]} r={crop ? 2 * k : 3} fill="var(--accent)" />}
      {/* передняя половина ленты */}
      {bands.map((b, i) => (
        <g key={'f' + i}>
          <path
            d={`M ${b.cx - b.rx} ${b.cy} A ${b.rx} ${b.ry ?? 4.5} 0 0 0 ${b.cx + b.rx} ${b.cy}`}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.25}
            strokeWidth={crop ? 6 * k : 9}
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
      {zone?.side && !crop && (
        <g fontSize="15" fontWeight="600" fill="var(--muted)" textAnchor="middle">
          <text x="24" y="270">П</text>
          <text x="176" y="270">Л</text>
        </g>
      )}
    </svg>
  )
}
