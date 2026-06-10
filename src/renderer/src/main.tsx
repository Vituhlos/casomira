import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Nová HeroUI vrstva PŘED starými styly — staré obrazovky si během
// přechodu drží vzhled (pozdější unlayered CSS vyhrává remízy).
import './styles/main.css'
import './styles/mac.css'
import './styles/app.css'
import { App } from './App'
import { StopkyApp } from './StopkyApp'
import { DevKit } from './screens/DevKit'

// Stejný renderer obsluhuje všechna okna. Okno se pozná podle hash markeru
// v adrese (viz main/windows.ts): #stopky, prázdné = hlavní app.
// #kit = kitchen-sink design systému (jen pro vývoj; v DevTools:
// location.hash = 'kit'; location.reload()).
const hash = window.location.hash.replace('#', '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hash === 'stopky' ? <StopkyApp /> : hash === 'kit' ? <DevKit /> : <App />}
  </StrictMode>
)
