import { Route, Routes } from 'react-router-dom'
import { ResumeView } from '../resume'
import { ClawView } from '../claw'
import { HomeView } from '../home'
import { TankBattle90View } from '../tank90'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/resume" element={<ResumeView />} />
      <Route path="/claw" element={<ClawView />} />
      <Route path="/tank90" element={<TankBattle90View />} />
    </Routes>
  )
}

