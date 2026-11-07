import { useState, type ComponentType } from 'react'
import { cx } from './ui'

/** Как «оживает» значок, когда вкладку выбрали */
export type TabAnim = 'bounce' | 'flip' | 'wiggle' | 'spin' | 'lift' | 'tick' | 'slide' | 'pop'

export type IslandItem<K extends string> = {
  key: K
  label: string
  icon: ComponentType<{ size?: number }>
  anim: TabAnim
}

/**
 * Овальный «островок» с вкладками, как в Telegram:
 * подсветка плавно переезжает к выбранной вкладке, а её значок коротко анимируется.
 */
export function IslandTabs<K extends string>({
  items,
  active,
  onSelect,
  size = 'md',
  className,
}: {
  items: readonly IslandItem<K>[]
  active: K | null
  onSelect: (key: K) => void
  size?: 'md' | 'lg'
  className?: string
}) {
  const idx = items.findIndex((i) => i.key === active)
  // play растёт при каждой смене вкладки (и при повторном нажатии) — по нему перезапускаем анимации
  const [play, setPlay] = useState(0)
  const [prev, setPrev] = useState(active)
  if (prev !== active) {
    setPrev(active)
    setPlay((p) => p + 1)
  }

  const n = items.length
  const lg = size === 'lg'

  return (
    <div
      role="tablist"
      className={cx('island relative grid overflow-hidden rounded-full p-1', lg ? 'h-[62px]' : 'h-[54px]', className)}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {idx >= 0 && (
        <div
          aria-hidden
          className="island-pill-track pointer-events-none absolute bottom-1 left-1 top-1"
          style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${idx * 100}%)` }}
        >
          <div key={play} className={cx('island-pill h-full w-full rounded-full', play > 0 && 'anim-pill')} />
        </div>
      )}
      {items.map((it, i) => {
        const on = i === idx
        const Icon = it.icon
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={on}
            onClick={() => {
              if (on) setPlay((p) => p + 1)
              onSelect(it.key)
            }}
            className={cx(
              'island-btn relative z-[1] flex min-w-0 flex-col items-center justify-center gap-[3px] rounded-full font-medium',
              lg ? 'text-[10.5px]' : 'text-[10px]',
              on ? 'text-accent-text' : 'text-muted',
            )}
          >
            <span key={on ? `on${play}` : 'off'} className={cx('flex', on && play > 0 && `tab-${it.anim}`)}>
              <Icon size={lg ? 25 : 21} />
            </span>
            <span className="max-w-full truncate px-0.5 leading-none">{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}
