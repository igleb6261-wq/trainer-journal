import {
  db,
  deleteClientCascade,
  rememberExercise,
  stamp,
  uid,
  type Client,
  type PhotoAngle,
  type PlanExercise,
  type Program,
  type SetEntry,
  type Workout,
  type WorkoutExercise,
} from '../db'

/* Демо-данные: вымышленные клиенты, чтобы потрогать приложение */

const iso = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const plan = (name: string, sets: number, reps: string, weight: number | null, rir = '2', rest = '2 мин', note = ''): PlanExercise => ({
  id: uid(),
  name,
  sets,
  reps,
  weight,
  rir,
  rest,
  note,
})

const set = (weight: number | null, reps: number, rir: number): SetEntry => ({ id: uid(), weight, reps, rir, done: true })

function demoPhoto(label: string, hue: number, width: number): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = 600
  c.height = 800
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 800)
  grad.addColorStop(0, `hsl(${hue},25%,32%)`)
  grad.addColorStop(1, `hsl(${hue},25%,16%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, 600, 800)
  // условный силуэт
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.beginPath()
  g.arc(300, 170, 62, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(300, 430, width, 200, 0, 0, Math.PI * 2)
  g.fill()
  g.fillRect(300 - width * 0.55, 560, width * 0.45, 220)
  g.fillRect(300 + width * 0.1, 560, width * 0.45, 220)
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.font = '600 34px -apple-system, sans-serif'
  g.textAlign = 'center'
  g.fillText(label, 300, 760)
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.8))
}

interface Spec {
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  days: { name: string; exercises: PlanExercise[] }[]
  progress: (week: number) => number // прибавка к весу по неделям
  measures: { days: number; values: Record<string, number> }[]
  photoWidths: [number, number]
}

const base = (c: Partial<Client>): Spec['client'] => ({
  lastName: '',
  firstName: '',
  middleName: '',
  birthDate: '',
  sex: '',
  phone: '',
  contact: '',
  goal: '',
  format: 'offline',
  startDate: iso(56),
  height: null,
  weight: null,
  notes: '',
  answers: {},
  avatarPhotoId: null,
  archived: false,
  demo: true,
  ...c,
})

const SPECS: Spec[] = [
  {
    client: base({
      lastName: 'Иванова',
      firstName: 'Анна',
      middleName: 'Сергеевна',
      birthDate: '1994-04-12',
      sex: 'f',
      phone: '+7 900 000-00-01',
      contact: '@anna_demo',
      goal: 'Рекомпозиция: −5 кг жира, подтянуть ягодицы и спину',
      height: 168,
      weight: 64.2,
      notes: 'Работает в офисе, любит тяги, не любит выпады.',
      answers: {
        q1: 'Растяжение голеностопа в 2021',
        q5: 'Иногда тянет поясницу после долгого сидения',
        q6: '6–7 часов, засыпает поздно',
        q7: 'Средний',
        q11: '1 год в фитнес-клубе без тренера',
        q12: 'Сидячая',
        q13: '5–6 тысяч',
      },
    }),
    days: [
      {
        name: 'День A — низ',
        exercises: [
          plan('Приседания со штангой', 3, '8-10', 40, '2', '2-3 мин', 'Глубина до параллели, колени по носкам'),
          plan('Румынская тяга', 3, '10-12', 35, '2', '2 мин', 'Спина нейтральная, таз назад'),
          plan('Ягодичный мост', 3, '10-12', 50),
          plan('Разведение ног в тренажёре', 3, '15', 30, '1', '1 мин'),
        ],
      },
      {
        name: 'День B — верх',
        exercises: [
          plan('Тяга верхнего блока', 3, '10-12', 35),
          plan('Жим гантелей лёжа', 3, '10-12', 10),
          plan('Тяга гантели в наклоне', 3, '10-12', 12),
          plan('Махи гантелями в стороны', 3, '12-15', 4, '1', '1 мин'),
        ],
      },
    ],
    progress: (w) => w * 2.5,
    measures: [
      { days: 56, values: { weight: 66.8, waist: 74, belly: 82, glutes: 98, thighL: 58, thighR: 58.5, chest: 90 } },
      { days: 28, values: { weight: 65.4, waist: 72.5, belly: 80, glutes: 98.5, thighL: 57.5, thighR: 58, chest: 89.5 } },
      { days: 3, values: { weight: 64.2, waist: 71, belly: 78, glutes: 99, thighL: 57, thighR: 57.5, chest: 89 } },
    ],
    photoWidths: [120, 108],
  },
  {
    client: base({
      lastName: 'Петров',
      firstName: 'Дмитрий',
      middleName: 'Олегович',
      birthDate: '1988-09-30',
      sex: 'm',
      phone: '+7 900 000-00-02',
      contact: '@dmitry_demo',
      goal: 'Набрать силу: присед 120, жим 100',
      height: 182,
      weight: 86,
      format: 'mixed',
      answers: { q1: 'Нет', q11: '5 лет, тренировался сам', q12: 'Активная (стройка)' },
    }),
    days: [
      {
        name: 'Силовая',
        exercises: [
          plan('Приседания со штангой', 4, '5', 100, '2', '3 мин'),
          plan('Жим лёжа', 4, '5', 80, '2', '3 мин', 'Лопатки сведены, ноги в пол'),
          plan('Тяга штанги в наклоне', 3, '8', 70),
          plan('Подтягивания', 3, '6-8', null, '1'),
        ],
      },
    ],
    progress: (w) => w * 2.5,
    measures: [
      { days: 49, values: { weight: 84, chest: 106, waist: 88, bicepsL: 38, bicepsR: 38.5 } },
      { days: 7, values: { weight: 86, chest: 108, waist: 88.5, bicepsL: 39, bicepsR: 39.5 } },
    ],
    photoWidths: [130, 136],
  },
  {
    client: base({
      lastName: 'Смирнова',
      firstName: 'Елена',
      birthDate: '1999-01-20',
      sex: 'f',
      contact: '@lena_demo',
      goal: 'Начать заниматься, убрать боль в спине',
      height: 160,
      weight: 55,
      format: 'online',
      startDate: iso(14),
      answers: { q5: 'Болит поясница после работы', q11: 'Нет опыта' },
    }),
    days: [
      {
        name: 'Фулбади',
        exercises: [
          plan('Гоблет-присед', 3, '12', 8, '3', '1,5 мин'),
          plan('Тяга верхнего блока', 3, '12', 25, '3'),
          plan('Ягодичный мост', 3, '15', 20, '3'),
          plan('Планка (сек)', 3, '30', null, '2', '1 мин'),
        ],
      },
    ],
    progress: (w) => w * 2,
    measures: [{ days: 14, values: { weight: 55, waist: 66, glutes: 92 } }],
    photoWidths: [100, 100],
  },
]

export async function loadDemo() {
  for (const spec of SPECS) {
    const client: Client = { ...spec.client, ...stamp() }
    await db.clients.add(client)

    const program: Program = {
      ...stamp(),
      clientId: client.id,
      name: 'Базовая программа',
      active: true,
      notes: '',
      days: spec.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises.map((e) => ({ ...e, id: uid() })) })),
    }
    await db.programs.add(program)
    for (const d of program.days) for (const e of d.exercises) await rememberExercise(e.name)

    // тренировки: 2 раза в неделю, ~ последние 7 недель
    const startDaysAgo = Math.min(52, Math.round((Date.now() - new Date(client.startDate).getTime()) / 86400000))
    let i = 0
    for (let ago = startDaysAgo; ago >= 2; ago -= 3 + (i % 2)) {
      const week = Math.floor((startDaysAgo - ago) / 7)
      const day = program.days[i % program.days.length]
      const exercises: WorkoutExercise[] = day.exercises.map((p, pi) => {
        const w = p.weight !== null ? Math.round((p.weight + spec.progress(week) * (pi === 0 ? 1 : 0.5)) / 2.5) * 2.5 : null
        const reps = parseInt(p.reps) || 10
        const n = p.sets ?? 3
        return {
          id: uid(),
          name: p.name,
          planNote: p.note,
          target: '',
          comment: i === 3 && pi === 0 ? 'Колено чуть уходило внутрь на последних повторах' : '',
          sets: Array.from({ length: n }, (_, si) => set(w, reps + ((i + si) % 3 === 0 ? 1 : 0) - (si === n - 1 ? 1 : 0), Math.max(0, 2 - (si === n - 1 ? 1 : 0)))),
        }
      })
      const t = Date.now() - ago * 86400000
      const wk: Workout = {
        id: uid(),
        createdAt: t,
        updatedAt: t,
        clientId: client.id,
        date: iso(ago),
        programId: program.id,
        dayId: day.id,
        dayName: day.name,
        status: 'done',
        exercises,
        comment: i % 3 === 0 ? 'Самочувствие хорошее, выспался(лась).' : i % 3 === 1 ? 'Немного уставший(ая) после работы.' : '',
        nextNote: i % 2 === 0 ? 'Прибавить вес в первом упражнении. Проверить технику в тяге.' : '',
        finishedAt: t + 3600000,
      }
      await db.workouts.add(wk)
      i++
    }

    for (const m of spec.measures) {
      await db.measurements.add({ ...stamp(), clientId: client.id, date: iso(m.days), values: m.values, note: '' })
    }

    // демо-фото
    const first = spec.measures[0].days
    const pairs: [number, number][] = [
      [first, spec.photoWidths[0]],
      [2, spec.photoWidths[1]],
    ]
    for (const [ago, width] of pairs) {
      for (const [angle, hue, label] of [
        ['front', 200, 'спереди'],
        ['side', 160, 'сбоку'],
      ] as [PhotoAngle, number, string][]) {
        const blob = await demoPhoto(`демо · ${label}`, hue, width)
        await db.photos.add({ ...stamp(), clientId: client.id, date: iso(ago), angle, comment: '', blob, thumb: blob })
      }
    }
  }
}

export async function deleteDemo() {
  const demo = await db.clients.filter((c) => !!c.demo).toArray()
  for (const c of demo) await deleteClientCascade(c.id)
}
