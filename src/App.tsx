import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconJournal, IconSettings, IconUsers } from './components/icons'
import { SlotsContext, ToastHost, cx } from './components/ui'
import ClientsList from './pages/ClientsList'
import ClientForm from './pages/ClientForm'
import ClientPage from './pages/ClientPage'
import ProgramEditor from './pages/ProgramEditor'
import WorkoutRunner from './pages/WorkoutRunner'
import ExerciseProgress from './pages/ExerciseProgress'
import Journal from './pages/Journal'
import Settings from './pages/Settings'
import { QuestionsEditor, MetricsEditor, ExercisesEditor } from './pages/SettingsEditors'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('scroller')?.scrollTo(0, 0)
  }, [pathname])
  return null
}

function BottomNav() {
  const item = (to: string, label: string, icon: ReactNode, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx('flex flex-1 flex-col items-center gap-0.5 pt-1.5 text-[10px] font-medium', isActive ? 'text-accent-text' : 'text-muted')
      }
    >
      {icon}
      {label}
    </NavLink>
  )
  const footer = document.getElementById('footer-slot')
  const navEl = (
    <nav className="safe-bottom border-t border-line bg-bar">
      <div className="flex h-[52px]">
        {item('/', 'Клиенты', <IconUsers size={26} />, true)}
        {item('/journal', 'Журнал', <IconJournal size={26} />)}
        {item('/settings', 'Настройки', <IconSettings size={26} />)}
      </div>
    </nav>
  )
  return footer ? createPortal(navEl, footer) : navEl
}

const withNav = (el: ReactNode) => (
  <>
    <div className="pb-24">{el}</div>
    <BottomNav />
  </>
)

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <ToastHost />
      <Shell>
        <Routes>
          <Route path="/" element={withNav(<ClientsList />)} />
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
function Shell({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<HTMLDivElement | null>(null)
  const [footer, setFooter] = useState<HTMLDivElement | null>(null)
  return (
    <SlotsContext.Provider value={{ header, footer }}>
      <div className="mx-auto flex h-dvh max-w-xl flex-col">
        <div ref={setHeader} className="relative z-30 shrink-0" />
        <main id="scroller" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {header && footer && children}
        </main>
        <div ref={setFooter} id="footer-slot" className="relative z-30 shrink-0" />
      </div>
    </SlotsContext.Provider>
  )
}
