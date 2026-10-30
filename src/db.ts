import Dexie, { type EntityTable } from 'dexie'

/* ============================================================
   Модель данных.
   У каждой записи: id (UUID), createdAt, updatedAt — чтобы позже
   можно было добавить синхронизацию с сервером.
   ============================================================ */

export interface Base {
  id: string
  createdAt: number
  updatedAt: number
}

export type Sex = 'm' | 'f' | ''
export type Format = 'online' | 'offline' | 'mixed' | ''

export interface Client extends Base {
  lastName: string
  firstName: string
  middleName: string
  birthDate: string // YYYY-MM-DD
  sex: Sex
  phone: string
  contact: string // Telegram / Instagram
  goal: string
  format: Format
  startDate: string
  height: number | null
  weight: number | null
  notes: string
  answers: Record<string, string> // questionId -> ответ
  avatarPhotoId: string | null
  archived: boolean
  demo?: boolean
}

export interface PlanExercise {
  id: string
  name: string
  sets: number | null
  reps: string // "8-12" или "10"
  weight: number | null
  rir: string
  rest: string
  note: string
}

export interface ProgramDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Program extends Base {
  clientId: string
  name: string
  active: boolean
  notes: string
  days: ProgramDay[]
}

export interface SetEntry {
  id: string
  weight: number | null
  reps: number | null
  rir: number | null
  done: boolean
}

export interface WorkoutExercise {
  id: string
  name: string
  planNote: string // заметка из программы (техника и т.п.)
  target: string // кратко цель из программы: "3×8-12 · 60 кг · RIR 2"
  comment: string
  sets: SetEntry[]
}

export interface Workout extends Base {
  clientId: string
  date: string // YYYY-MM-DD
  programId: string | null
  dayId: string | null
  dayName: string
  status: 'active' | 'done'
  exercises: WorkoutExercise[]
  comment: string // общий комментарий
  nextNote: string // "на следующую тренировку"
  finishedAt: number | null
}

export interface Measurement extends Base {
  clientId: string
  date: string
  values: Record<string, number> // metricKey -> значение
  note: string
}

export type PhotoAngle = 'front' | 'side' | 'back' | 'other'

export interface Photo extends Base {
  clientId: string
  date: string
  angle: PhotoAngle
  comment: string
  blob: Blob
  thumb: Blob
  isAvatar?: boolean
}

export interface ExerciseRef extends Base {
  name: string
  key: string // нормализованное имя (для поиска дублей)
  group?: string // группа мышц (из библиотеки или своя)
  basic?: boolean // показывать во вкладке «Базовые»
}

export interface Setting {
  key: string
  value: unknown
}

export interface Question {
  id: string
  text: string
}

export interface Metric {
  key: string
  label: string
  unit: string
  hidden: boolean
}

class TrainerDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  programs!: EntityTable<Program, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  photos!: EntityTable<Photo, 'id'>
  exercises!: EntityTable<ExerciseRef, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('trainer-journal')
    this.version(1).stores({
      clients: 'id, lastName, archived, updatedAt',
      programs: 'id, clientId, updatedAt',
      workouts: 'id, clientId, date, status, [clientId+date], updatedAt',
      measurements: 'id, clientId, date, [clientId+date]',
      photos: 'id, clientId, date, [clientId+date]',
      exercises: 'id, &key, name',
      settings: 'key',
    })
  }
}

export const db = new TrainerDB()

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export const now = () => Date.now()

export const stamp = () => {
  const t = now()
  return { id: uid(), createdAt: t, updatedAt: t }
}

/* ---------------- Значения по умолчанию ---------------- */

export const DEFAULT_QUESTIONS: Question[] = [
  'Травмы и операции',
  'Хронические заболевания',
  'Давление, сердце',
  'Принимаемые лекарства',
  'Боли в спине / суставах',
  'Сон (сколько часов, качество)',
  'Уровень стресса',
  'Питание (сколько раз в день, что обычно ест)',
  'Сколько воды в день',
  'Алкоголь / курение',
  'Опыт тренировок',
  'Работа (сидячая / активная)',
  'Шагов в день',
  'Ограничения и противопоказания',
].map((text, i) => ({ id: `q${i + 1}`, text }))

export const DEFAULT_METRICS: Metric[] = [
  ['weight', 'Вес', 'кг'],
  ['chest', 'Грудь', 'см'],
  ['shoulders', 'Плечи (обхват)', 'см'],
  ['back', 'Ширина спины', 'см'],
  ['waist', 'Талия', 'см'],
  ['belly', 'Живот (по пупку)', 'см'],
  ['pelvis', 'Таз', 'см'],
  ['glutes', 'Ягодицы', 'см'],
  ['thighL', 'Бедро лев.', 'см'],
  ['thighR', 'Бедро прав.', 'см'],
  ['calfL', 'Голень лев.', 'см'],
  ['calfR', 'Голень прав.', 'см'],
  ['bicepsL', 'Бицепс лев.', 'см'],
  ['bicepsR', 'Бицепс прав.', 'см'],
  ['forearm', 'Предплечье', 'см'],
].map(([key, label, unit]) => ({ key, label, unit, hidden: false }))

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return (s?.value as T) ?? fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

/* ---------------- Справочник упражнений ---------------- */

export const exKey = (name: string) => name.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')

export async function rememberExercise(name: string) {
  const n = name.trim()
  if (!n) return
  const key = exKey(n)
  const exists = await db.exercises.where('key').equals(key).first()
  if (!exists) await db.exercises.add({ ...stamp(), name: n, key })
}

/* ---------------- Удаление клиента целиком ---------------- */

export async function deleteClientCascade(clientId: string) {
  await db.transaction('rw', [db.clients, db.programs, db.workouts, db.measurements, db.photos], async () => {
    await db.programs.where('clientId').equals(clientId).delete()
    await db.workouts.where('clientId').equals(clientId).delete()
    await db.measurements.where('clientId').equals(clientId).delete()
    await db.photos.where('clientId').equals(clientId).delete()
    await db.clients.delete(clientId)
  })
}

/* ---------------- Хранилище: просим браузер не удалять данные ---------------- */

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* ignore */
  }
  return false
}
