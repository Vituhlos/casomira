import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/mac.css'
import './styles/app.css'
import { App } from './App'
import { StopkyApp } from './StopkyApp'

// Stejný renderer obsluhuje obě okna. Stopkové okno se pozná podle markeru
// `#stopky` v adrese (viz main/windows.ts).
const jeStopky = window.location.hash.replace('#', '') === 'stopky'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{jeStopky ? <StopkyApp /> : <App />}</StrictMode>
)
