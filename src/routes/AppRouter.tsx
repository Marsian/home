import { Navigate, Route, Routes } from 'react-router-dom'
import { ResumeView } from '../resume'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/resume" replace />} />
      <Route path="/resume" element={<ResumeView />} />
    </Routes>
  )
}

