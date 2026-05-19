import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ResumeView } from '../resume'
import { ClawView } from '../claw'
import { HomeView } from '../home'
import { GameCenterView } from '../game-center'
import AppLayout from './AppLayout'

const TankBattle90View = lazy(() => import('../game-center/tank90/TankBattle90View'))
const FruitNinjaView = lazy(() => import('../game-center/fruit-ninja/FruitNinjaView'))
const PixelKnightView = lazy(() => import('../game-center/pixel-knight/PixelKnightView'))
const PixelKnightDataView = lazy(() => import('../game-center/pixel-knight/PixelKnightDataView'))
const PixelKnightCharacterDemoView = lazy(() => import('../game-center/pixel-knight/PixelKnightCharacterDemoView'))
const PixelKnightMonsterListView = lazy(() => import('../game-center/pixel-knight/PixelKnightMonsterListView'))
const PixelKnightMonsterDetailView = lazy(() => import('../game-center/pixel-knight/PixelKnightMonsterDetailView'))
const PixelKnightPixelEditorFilesView = lazy(() => import('../game-center/pixel-knight/PixelKnightPixelEditorFilesView'))
const PixelKnightPixelEditorView = lazy(() => import('../game-center/pixel-knight/PixelKnightPixelEditorView'))
const PixelKnightMapEditorFilesView = lazy(() => import('../game-center/pixel-knight/PixelKnightMapEditorFilesView'))
const PixelKnightMapEditorView = lazy(() => import('../game-center/pixel-knight/PixelKnightMapEditorView'))
const StarTripView = lazy(() => import('../game-center/star-trip'))
const FruitNinjaBladeLabView = lazy(() => import('../game-center/fruit-ninja/FruitNinjaBladeLabView'))
const FruitGalleryView = lazy(() => import('../game-center/fruit-ninja/FruitGalleryView'))
const FruitGallerySlicedView = lazy(() => import('../game-center/fruit-ninja/FruitGallerySlicedView'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/games/fruit-ninja/gallery" element={<FruitGalleryView />} />
        <Route path="/games/fruit-ninja/gallery-sliced" element={<FruitGallerySlicedView />} />
        <Route path="/games/fruit-ninja/blade-lab" element={<FruitNinjaBladeLabView />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeView />} />
          <Route path="/resume" element={<ResumeView />} />
          <Route path="/claw" element={<ClawView />} />
          <Route path="/games" element={<GameCenterView />} />
          <Route path="/games/tank90" element={<TankBattle90View />} />
          <Route path="/games/fruit-ninja" element={<FruitNinjaView />} />
          <Route path="/games/pixel-knight" element={<PixelKnightView />} />
          <Route path="/games/pixel-knight/data" element={<PixelKnightDataView />} />
          <Route path="/games/pixel-knight/character-demo" element={<PixelKnightCharacterDemoView />} />
          <Route path="/games/pixel-knight/monsters" element={<PixelKnightMonsterListView />} />
          <Route path="/games/pixel-knight/monsters/:monsterId" element={<PixelKnightMonsterDetailView />} />
          <Route path="/games/pixel-knight/pixel-editor" element={<PixelKnightPixelEditorFilesView />} />
          <Route path="/games/pixel-knight/pixel-editor/edit" element={<PixelKnightPixelEditorView />} />
          <Route path="/games/pixel-knight/map-editor" element={<PixelKnightMapEditorFilesView />} />
          <Route path="/games/pixel-knight/map-editor/edit" element={<Navigate to="/games/pixel-knight/map-editor" replace />} />
          <Route path="/games/pixel-knight/map-editor/edit/:mapSlug" element={<PixelKnightMapEditorView />} />
          <Route path="/games/star-trip" element={<StarTripView />} />
          {/* Back-compat: old direct entry */}
          <Route path="/tank90" element={<Navigate to="/games/tank90" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
