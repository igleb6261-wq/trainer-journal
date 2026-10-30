import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { requestPersistence } from './db'
import { applyTheme, getTheme } from './lib/theme'
import { setupAutoUpdate } from './lib/update'
import { seedLibrary } from './lib/library'

applyTheme(getTheme())
requestPersistence()
setupAutoUpdate()
seedLibrary()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
