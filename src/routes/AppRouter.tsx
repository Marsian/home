import { Navigate, Route, Routes } from 'react-router-dom'
import { ResumeView } from '../resume'
import { HomeView } from '../home'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/resume" element={<ResumeView />} />
    </Routes>
  )
}

