import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { requestPersistence } from './db'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())
requestPersistence()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
