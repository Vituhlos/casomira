import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/mac.css'
import './styles/app.css'
import { App } from './App'
import { StopkyApp } from './StopkyApp'

// Stejný renderer obsluhuje všechna okna. Okno se pozná podle hash markeru
// v adrese (viz main/windows.ts): #stopky, prázdné = hlavní app.
const hash = window.location.hash.replace('#', '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hash === 'stopky' ? <StopkyApp /> : <App />}
  </StrictMode>
)
