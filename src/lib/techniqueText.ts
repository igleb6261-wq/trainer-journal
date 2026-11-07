import { exKey } from '../db'

/**
 * Описание техники упражнения.
 * Текст пишется в простом виде, по строкам:
 *   «М: …» или «Мышцы: …» — какие мышцы работают
 *   «С: …» или «Исходное положение: …»
 *   «1. …», «2. …» — шаги выполнения
 *   «! …» — важный момент, «× …» — частая ошибка
 *   «Дыхание: …»
 * Также понимает заголовки «Выполнение:», «Важно:», «Частые ошибки:» со строками «- …» —
 * так текст выглядит, когда тренер правит его сам.
 */
export type Technique = {
  muscles?: string
  start?: string
  steps: string[]
  tips: string[]
  errors: string[]
  breath?: string
  notes: string[]
}

type Sec = 'steps' | 'tips' | 'errors' | 'notes' | 'start'

export function parseTechnique(text: string): Technique {
  const t: Technique = { steps: [], tips: [], errors: [], notes: [] }
  let sec: Sec = 'notes'
  const push = (s: Sec, v: string) => {
    if (s === 'start') t.start = t.start ? `${t.start} ${v}` : v
    else t[s].push(v)
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    let m: RegExpMatchArray | null
    if ((m = line.match(/^(?:М|Мышцы|Работают мышцы):\s*(.*)$/i))) {
      t.muscles = m[1]
      continue
    }
    if ((m = line.match(/^(?:С|Старт|Исходное положение):\s*(.*)$/i))) {
      if (m[1]) t.start = m[1]
      sec = m[1] ? 'notes' : 'start'
      continue
    }
    if ((m = line.match(/^Дыхание:\s*(.*)$/i))) {
      t.breath = m[1]
      continue
    }
    if (/^(?:Выполнение|Как выполнять):?$/i.test(line)) {
      sec = 'steps'
      continue
    }
    if (/^(?:Важно|Ключевые моменты|Подсказки):?$/i.test(line)) {
      sec = 'tips'
      continue
    }
    if (/^(?:Ошибки|Частые ошибки):?$/i.test(line)) {
      sec = 'errors'
      continue
    }
    if ((m = line.match(/^\d+[.)]\s*(.*)$/))) {
      t.steps.push(m[1])
      sec = 'steps'
      continue
    }
    if ((m = line.match(/^!\s*(.*)$/))) {
      t.tips.push(m[1])
      continue
    }
    if ((m = line.match(/^×\s*(.*)$/))) {
      t.errors.push(m[1])
      continue
    }
    if ((m = line.match(/^[-–—•]\s*(.*)$/))) {
      push(sec === 'start' ? 'notes' : sec, m[1])
      continue
    }
    push(sec, line)
  }
  return t
}

/** Человеческий вид текста — для правки */
export function techniqueToText(t: Technique): string {
  const out: string[] = []
  if (t.muscles) out.push(`Мышцы: ${t.muscles}`)
  if (t.start) out.push(`Исходное положение: ${t.start}`)
  if (t.steps.length) out.push('Выполнение:\n' + t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
  if (t.tips.length) out.push('Важно:\n' + t.tips.map((s) => `- ${s}`).join('\n'))
  if (t.errors.length) out.push('Частые ошибки:\n' + t.errors.map((s) => `- ${s}`).join('\n'))
  if (t.breath) out.push(`Дыхание: ${t.breath}`)
  if (t.notes.length) out.push(t.notes.join('\n'))
  return out.join('\n\n')
}

let cache: Promise<Map<string, string>> | null = null

/** Стандартное описание из встроенной библиотеки (файл подгружается при первом открытии) */
export async function builtinTechnique(name: string): Promise<string | null> {
  if (!cache) cache = import('./technique').then((m) => m.TECHNIQUE)
  const map = await cache
  return map.get(exKey(name)) ?? null
}
