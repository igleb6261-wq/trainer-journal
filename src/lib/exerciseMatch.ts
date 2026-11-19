import { exKey } from '../db'

/* ============================================================
   Сопоставление названий упражнений с библиотекой.
   В программах упражнение может быть записано короче или иначе,
   чем в библиотеке («Тяга верхнего блока» vs «Тяга верхнего блока
   к груди»). Чтобы видео техники всё равно находилось, ищем
   похожее упражнение из библиотеки.
   ============================================================ */

/** Короткие и разговорные названия → название в библиотеке */
const ALIASES: Record<string, string> = {
  'жим лежа': 'Жим штанги лёжа',
  'подтягивания': 'Подтягивания широким хватом',
  'присед': 'Приседания со штангой',
  'приседания': 'Приседания со штангой',
  'становая': 'Становая тяга',
  'армейский жим': 'Жим штанги стоя (армейский жим)',
  'хип-траст': 'Ягодичный мост со штангой (хип-траст)',
  'хип траст': 'Ягодичный мост со штангой (хип-траст)',
}

// без пояснений в скобках и кавычек: «Планка (сек)» → «планка»
const loose = (key: string) => key.replace(/\([^)]*\)/g, ' ').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Находит в списке упражнение, похожее на name. Возвращает его название
 * или null, если похожего нет. Список — упражнения, у которых есть видео.
 */
export function matchExercise(name: string, candidates: { name: string; key: string }[]): string | null {
  const q = exKey(name)
  if (!q) return null
  const exact = candidates.find((c) => c.key === q)
  if (exact) return exact.name
  const alias = ALIASES[q] ?? ALIASES[loose(q)]
  if (alias) {
    const a = candidates.find((c) => c.key === exKey(alias))
    if (a) return a.name
  }
  const ql = loose(q)
  const list = candidates.map((c) => ({ c, k: loose(c.key) }))
  const same = list.find((x) => x.k === ql)
  if (same) return same.c.name
  // в библиотеке уточнённый вариант: «тяга гантели в наклоне» → «… одной рукой» (берём самый короткий)
  const longer = list.filter((x) => x.k.startsWith(ql + ' ')).sort((a, b) => a.k.length - b.k.length)
  if (longer.length) return longer[0].c.name
  // в программе уточнение, которого нет в библиотеке: «жим ногами в тренажёре» → «жим ногами» (самый длинный)
  const shorter = list.filter((x) => ql.startsWith(x.k + ' ')).sort((a, b) => b.k.length - a.k.length)
  if (shorter.length) return shorter[0].c.name
  // «… в тренажёре» и т.п. — пробуем без уточнения
  const bare = q.replace(/ (в|на) тренажере$/, '')
  if (bare !== q) return matchExercise(bare, candidates)
  return null
}
