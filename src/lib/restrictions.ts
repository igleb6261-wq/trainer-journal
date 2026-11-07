import type { Client, Question } from '../db'

/* Ограничения из анкеты, которые важно видеть во время тренировки */

const KEYWORDS = ['травм', 'операц', 'хронич', 'давлен', 'сердц', 'бол', 'огранич', 'противопоказ', 'лекарств']
const EMPTY = /^(нет|не было|не имеется|нету|отсутству\w*|-+|—|no|n\/a)[.!]?$/i

export function restrictionsOf(client: Client, questions: Question[]): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = []
  for (const q of questions) {
    const t = q.text.toLowerCase()
    if (!KEYWORDS.some((k) => t.includes(k))) continue
    const a = (client.answers[q.id] ?? '').trim()
    if (!a || EMPTY.test(a)) continue
    out.push({ q: q.text, a })
  }
  return out
}
