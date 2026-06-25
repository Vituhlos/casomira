import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'
import { App } from './App'
import { StopkyApp } from './StopkyApp'
import { DevKit } from './screens/DevKit'

// Stejný renderer obsluhuje všechna okna. Okno se pozná podle hash markeru
// v adrese (viz main/windows.ts): #stopky, prázdné = hlavní app.
// #kit = kitchen-sink design systému (jen pro vývoj; v DevTools:
// location.hash = 'kit'; location.reload()).
const hash = window.location.hash.replace('#', '')

// Okno Stopek má vlastní průhledný shell (Windows 11 Mica). Hlavní okno se
// zprůhlední přes html[data-native-vibrancy='true'], které nastavuje App.tsx
// podle schopností konkrétní platformy.
if (hash === 'stopky') document.documentElement.classList.add('stopky-window')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hash === 'stopky' ? <StopkyApp /> : hash === 'kit' ? <DevKit /> : <App />}
  </StrictMode>
)
