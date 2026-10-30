import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_METRICS, DEFAULT_QUESTIONS, type Metric, type Question } from '../db'

const WEEK = 7 * 86400000

/** true — если резервную копию не делали больше 7 дней */
export function useBackupReminder() {
  return useLiveQuery(async () => {
    const last = (await db.settings.get('lastBackupAt'))?.value as number | undefined
    const real = (await db.clients.toArray()).filter((c) => !c.demo)
    if (!real.length) return false
    const first = Math.min(...real.map((c) => c.createdAt))
    const since = last ?? first
    return Date.now() - since > WEEK
  }, [])
}

export function useQuestions(): Question[] | undefined {
  return useLiveQuery(async () => {
    const s = await db.settings.get('questions')
    return (s?.value as Question[]) ?? DEFAULT_QUESTIONS
  }, [])
}

export function useMetrics(): Metric[] | undefined {
  return useLiveQuery(async () => {
    const s = await db.settings.get('metrics')
    return (s?.value as Metric[]) ?? DEFAULT_METRICS
  }, [])
}
