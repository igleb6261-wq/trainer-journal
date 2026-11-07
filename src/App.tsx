import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { IconCalendar, IconJournal, IconSettings, IconUsers } from './components/icons'
import { SlotsContext, ToastHost } from './components/ui'
import { IslandTabs, type IslandItem } from './components/IslandTabs'
import ClientsList from './pages/ClientsList'
import ClientForm from './pages/ClientForm'
import ClientPage from './pages/ClientPage'
import ProgramEditor from './pages/ProgramEditor'
import WorkoutRunner from './pages/WorkoutRunner'
import ExerciseProgress from './pages/ExerciseProgress'
import Journal from './pages/Journal'
import Today from './pages/Today'
import { KeyboardBar } from './components/KeyboardBar'
import Settings from './pages/Settings'
import { QuestionsEditor, MetricsEditor, ExercisesEditor } from './pages/SettingsEditors'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('scroller')?.scrollTo(0, 0)
  }, [pathname])
  return null
}

const NAV = [
  { key: 'clients', label: 'Клиенты', icon: IconUsers, anim: 'bounce' },
  { key: 'today', label: 'Сегодня', icon: IconCalendar, anim: 'flip' },
  { key: 'journal', label: 'Журнал', icon: IconJournal, anim: 'wiggle' },
  { key: 'settings', label: 'Настройки', icon: IconSettings, anim: 'spin' },
] as const satisfies readonly IslandItem<string>[]
type NavKey = (typeof NAV)[number]['key']
const NAV_PATH: Record<NavKey, string> = { clients: '/', today: '/today', journal: '/journal', settings: '/settings' }

/** На каких экранах видна нижняя панель и какая вкладка подсвечена */
function navKeyOf(pathname: string): NavKey | null {
  if (pathname === '/' || pathname === '') return 'clients'
  if (pathname === '/today') return 'today'
  if (pathname === '/journal') return 'journal'
  if (pathname === '/settings') return 'settings'
  if (/^\/client\/[^/]+$/.test(pathname) && pathname !== '/client/new') return 'clients'
  return null
}

/** Нижняя панель — отдельный овальный островок, плавает над содержимым */
function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const key = navKeyOf(pathname)
  if (!key) return null
  return (
    <nav className="nav-dock pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <IslandTabs
        items={NAV}
        active={key}
        size="lg"
        className="pointer-events-auto"
        onSelect={(k) => {
          const to = NAV_PATH[k]
          // нажатие на уже открытую вкладку — прокрутить в начало
          if (to === pathname) document.getElementById('scroller')?.scrollTo({ top: 0, behavior: 'smooth' })
          else navigate(to)
        }}
      />
    </nav>
  )
}

const withNav = (el: ReactNode) => <div className="nav-pad">{el}</div>

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <ToastHost />
      <KeyboardBar />
      <Shell nav={<BottomNav />}>
        <Routes>
          <Route path="/" element={withNav(<ClientsList />)} />
          <Route path="/today" element={withNav(<Today />)} />
          <Route path="/journal" element={withNav(<Journal />)} />
          <Route path="/settings" element={withNav(<Settings />)} />
          <Route path="/settings/questions" element={<QuestionsEditor />} />
          <Route path="/settings/metrics" element={<MetricsEditor />} />
          <Route path="/settings/exercises" element={<ExercisesEditor />} />
          <Route path="/client/new" element={<ClientForm />} />
          <Route path="/client/:id" element={withNav(<ClientPage />)} />
          <Route path="/client/:id/edit" element={<ClientForm />} />
          <Route path="/client/:id/program/:programId" element={<ProgramEditor />} />
          <Route path="/client/:id/workout/:workoutId" element={<WorkoutRunner />} />
          <Route path="/client/:id/progress" element={<ExerciseProgress />} />
          <Route path="*" element={withNav(<ClientsList />)} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}

/** Каркас: шапка сверху, прокручиваемое содержимое, нижняя панель снизу */
function Shell({ children, nav }: { children: ReactNode; nav: ReactNode }) {
  const [header, setHeader] = useState<HTMLDivElement | null>(null)
  const [footer, setFooter] = useState<HTMLDivElement | null>(null)
  return (
    <SlotsContext.Provider value={{ header, footer }}>
      <div className="relative mx-auto flex h-dvh max-w-xl flex-col">
        <div ref={setHeader} className="relative z-30 shrink-0" />
        <main id="scroller" className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {header && footer && children}
        </main>
        <div ref={setFooter} id="footer-slot" className="relative z-30 shrink-0" />
        {header && footer && nav}
      </div>
    </SlotsContext.Provider>
  )
}
