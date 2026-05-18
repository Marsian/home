import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Bug, Database, Map, Swords } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import knightManifestData from '@/game-center/pixel-knight/assets/characters/knight.json'
import swordMatrixData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import shieldMatrixData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'
import armorMatrixData from '@/game-center/pixel-knight/assets/equipment/armor/iron-armor.json'
import clothCapMatrixData from '@/game-center/pixel-knight/assets/equipment/helmet/cloth-cap.json'
import helmetMatrixData from '@/game-center/pixel-knight/assets/equipment/helmet/iron-helmet.json'
import characterSelectBg from '@/game-center/pixel-knight/assets/ui/character-select-bg-clean.png'
import buttonDisabledFrame from '@/game-center/pixel-knight/assets/ui/character-select/button-disabled.png'
import buttonPrimaryFrame from '@/game-center/pixel-knight/assets/ui/character-select/button-primary.png'
import characterCardFocusedFrame from '@/game-center/pixel-knight/assets/ui/character-select/character-card-focused.png'
import characterCardNormalFrame from '@/game-center/pixel-knight/assets/ui/character-select/character-card-normal.png'
import characterCardSelectedFrame from '@/game-center/pixel-knight/assets/ui/character-select/character-card-selected.png'
import titleBarFrame from '@/game-center/pixel-knight/assets/ui/character-select/title-bar.png'
import closeButtonFrame from '@/game-center/pixel-knight/assets/ui/inventory/close-button-v2.png'
import hudBackpackButton from '@/game-center/pixel-knight/assets/ui/inventory/hud-backpack-button-v2.png'
import hudBlueFill from '@/game-center/pixel-knight/assets/ui/inventory/hud-blue-fill-core-v2.png'
import hudHealthFrame from '@/game-center/pixel-knight/assets/ui/inventory/hud-status-frame-v2.png'
import hudHealthFrameFront from '@/game-center/pixel-knight/assets/ui/inventory/hud-status-frame-front-v2.png'
import hudHpFill from '@/game-center/pixel-knight/assets/ui/inventory/hud-hp-fill-core-v2.png'
import hudKnightPortrait from '@/game-center/pixel-knight/assets/ui/inventory/hud-portrait-knight-v4.png'
import hudMinimapFrame from '@/game-center/pixel-knight/assets/ui/inventory/hud-minimap-frame-v2.png'
import inventoryBgFrame from '@/game-center/pixel-knight/assets/ui/inventory/inventory-bg-v2.png'
import inventoryGridPanel from '@/game-center/pixel-knight/assets/ui/inventory/inventory-grid-6x6-v2.png'
import inventorySlotFrame from '@/game-center/pixel-knight/assets/ui/inventory/inventory-slot-v2.png'
import placeholderAmuletIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/amulet.png'
import placeholderArmorIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/armor.png'
import placeholderHelmetIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/helmet.png'
import placeholderMainHandIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/main-hand.png'
import placeholderOffHandIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/off-hand.png'
import placeholderRingIcon from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/ring.png'
import statArmorIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/armor.png'
import statAttackIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/attack.png'
import statCritChanceIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/crit-chance.png'
import statCritDamageIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/crit-damage.png'
import statGoldIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/gold.png'
import statHealthIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/health.png'
import statMoveSpeedIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/move-speed.png'
import statSkillIcon from '@/game-center/pixel-knight/assets/ui/inventory/stats/skill.png'
import {
  drawMatrixCharacter,
  type MatrixEquipmentPiece,
  type MatrixEquipmentSlot,
  type MatrixManifest,
} from '@/game-center/pixel-knight/rendering/matrixCharacterRenderer'

import {
  createStarterShield,
  createStarterSword,
  rarityLabel,
  rarityTone,
  skills,
  slotLabel,
} from './content/data'
import { clearPixelKnightPreloadCache, preloadPixelKnightAssets } from './game/preload'
import { availableOtherworldDungeonIds } from './maps/otherworldRegistry'
import { PixelKnightGame } from './pixelKnightGame'
import {
  applyPixelKnightRunResult,
  derivePixelKnightStats,
  loadPixelKnightSave,
  pixelKnightItemStatLine,
  savePixelKnightSave,
} from './profile'
import type {
  BaseClassId,
  DungeonSelectState,
  EquipmentSlot,
  ItemInstance,
  MapHotspot,
  PixelKnightHudState,
  PixelKnightCharacterProfile,
  PixelKnightSave,
  PreloadProgress,
  RenderableEquipmentAssetId,
  VillageHotspotKind,
} from './types'
import { LoadingOverlay } from './ui/LoadingOverlay'
import { OtherworldMapOverlay } from './ui/OtherworldMapOverlay'

const initialPreload: PreloadProgress = {
  loaded: 0,
  total: 5,
  ratio: 0,
  label: '正在校准副本与词条表',
}

const defaultHud: PixelKnightHudState = {
  phase: 'boot',
  mapKind: 'village',
  dungeonName: '村庄大厅',
  difficultyLabel: '普通',
  objectiveLabel: '准备中',
  encounterLabel: '待机',
  health: 0,
  maxHealth: 0,
  enemiesLeft: 0,
  elapsedMs: 0,
  blessingActive: false,
  portalNearby: false,
  minimapRows: [],
  playerCell: { x: 0, y: 0 },
  portalCell: { x: 0, y: 0 },
  hotspots: [],
  nearbyHotspot: null,
  recentLoot: [],
  cooldowns: {
    basic: 0,
    whirlwind: 0,
    shield: 0,
    holy: 0,
    blessing: 0,
    dodge: 0,
  },
}

type MinimapCell = { x: number; y: number }

const minimapPlayerCellStore = (() => {
  let cell: MinimapCell = defaultHud.playerCell
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => cell,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set: (nextCell: MinimapCell) => {
      if (cell.x === nextCell.x && cell.y === nextCell.y) return
      cell = nextCell
      listeners.forEach((listener) => listener())
    },
  }
})()

const selectKnightManifest = knightManifestData as MatrixManifest
const selectKnightEquipment: Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>> = {
  mainHand: swordMatrixData as MatrixEquipmentPiece,
  offHand: shieldMatrixData as MatrixEquipmentPiece,
}

type MatrixEquipmentLoadout = Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>>

const equipmentSlotOrder: EquipmentSlot[] = [
  'helmet',
  'armor',
  'mainHand',
  'offHand',
  'amulet',
  'ring',
]

const BACKPACK_VISIBLE_CAPACITY = 36
const STORAGE_CAPACITY = 36

const matrixEquipmentByAssetId: Record<RenderableEquipmentAssetId, MatrixEquipmentPiece> = {
  'cloth-cap': clothCapMatrixData as MatrixEquipmentPiece,
  'iron-helmet': helmetMatrixData as unknown as MatrixEquipmentPiece,
  'iron-armor': armorMatrixData as unknown as MatrixEquipmentPiece,
  'iron-sword': swordMatrixData as MatrixEquipmentPiece,
  'wood-shield': shieldMatrixData as MatrixEquipmentPiece,
}

function resolveMatrixEquipment(item: ItemInstance | null | undefined) {
  if (!item?.assetId) return null
  return matrixEquipmentByAssetId[item.assetId] ?? null
}

function resolveProfileMatrixEquipment(profile: Pick<PixelKnightCharacterProfile, 'equipment'>): MatrixEquipmentLoadout {
  return {
    mainHand: resolveMatrixEquipment(profile.equipment.mainHand),
    offHand: resolveMatrixEquipment(profile.equipment.offHand),
    helmet: resolveMatrixEquipment(profile.equipment.helmet),
    armor: resolveMatrixEquipment(profile.equipment.armor),
  }
}

const characterSelectEntries: Array<{
  id: string
  classId?: BaseClassId
  name?: string
  label?: string
}> = [
  {
    id: 'slot-knight',
    classId: 'knight',
    name: '骑士',
    label: 'KNIGHT',
  },
  { id: 'slot-empty-1' },
  { id: 'slot-empty-2' },
]

function CharacterSelectKnightCanvas({ equipment }: { equipment: MatrixEquipmentLoadout }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let disposed = false
    let frameId = 0
    let lastTs = performance.now()
    let elapsed = 0

    const render = (timestamp: number) => {
      if (disposed) return
      const dt = Math.min(34, timestamp - lastTs)
      lastTs = timestamp
      elapsed += dt

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false

      const renderOffsetY = 22
      const idleBreath = Math.sin(elapsed / 280)
      const shadowPulse = 0.94 + idleBreath * 0.035
      ctx.fillStyle = 'rgba(23, 18, 11, 0.34)'
      ctx.beginPath()
      ctx.ellipse(
        256,
        414 + renderOffsetY + idleBreath * 1.2,
        108 * shadowPulse,
        27 + idleBreath * 0.55,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()

      drawMatrixCharacter(ctx, selectKnightManifest, {
        actorX: 256,
        actorFeetY: 404 + renderOffsetY,
        pixelSize: 12,
        facing: 'right',
        mode: 'idle',
        timeMs: elapsed,
        equipment,
      })

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
    }
  }, [equipment])

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      className="mx-auto block h-full w-auto max-w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function CharacterSelectAvatarCanvas({ equipment }: { equipment: MatrixEquipmentLoadout }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.clip()
    drawMatrixCharacter(ctx, selectKnightManifest, {
      actorX: 64,
      actorFeetY: 183,
      pixelSize: 5,
      facing: 'right',
      mode: 'static',
      timeMs: 0,
      equipment,
    })
    ctx.restore()
  }, [equipment])

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      className="absolute left-[6.7%] top-[13%] h-[67%] w-[18.8%]"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  )
}

function InventoryCharacterCanvas({ profile }: { profile: PixelKnightCharacterProfile }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let disposed = false
    let frameId = 0
    let lastTs = performance.now()
    let elapsed = 0

    const equipment = resolveProfileMatrixEquipment(profile)

    const render = (timestamp: number) => {
      if (disposed) return
      const dt = Math.min(34, timestamp - lastTs)
      lastTs = timestamp
      elapsed += dt

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      drawMatrixCharacter(ctx, selectKnightManifest, {
        actorX: 256,
        actorFeetY: 500,
        pixelSize: 10,
        facing: 'right',
        mode: 'idle',
        timeMs: elapsed,
        equipment,
      })

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
    }
  }, [profile.equipment.armor, profile.equipment.helmet, profile.equipment.mainHand, profile.equipment.offHand])

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={560}
      className="pointer-events-none absolute left-1/2 top-[7%] h-[78%] w-auto -translate-x-1/2"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export default function PixelKnightView() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<PixelKnightGame | null>(null)

  const [save, setSave] = useState<PixelKnightSave>(() => loadPixelKnightSave())
  const saveRef = useRef(save)
  const [preload, setPreload] = useState(initialPreload)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'home' | 'playing' | 'error'>('loading')
  const [hud, setHud] = useState(defaultHud)
  const [selected, setSelected] = useState<DungeonSelectState>({
    dungeonId: 'ember-forge',
    selectedDifficulty: 'normal',
    unlockedDifficulties: ['normal'],
  })
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [homeStage, setHomeStage] = useState<'character' | 'village'>('character')
  const [activeVillagePanel, setActiveVillagePanel] = useState<VillageHotspotKind | null>(null)

  useEffect(() => {
    saveRef.current = save
    savePixelKnightSave(save)
  }, [save])

  const profile = save.profilesByClassId[save.activeClassId]

  const updateActiveProfile = (fn: (current: PixelKnightCharacterProfile) => PixelKnightCharacterProfile) => {
    setSave((current) => ({
      ...current,
      profilesByClassId: {
        ...current.profilesByClassId,
        [current.activeClassId]: fn(current.profilesByClassId[current.activeClassId]),
      },
    }))
  }

  useEffect(() => {
    const dungeonId = selected.dungeonId
    setSelected((current) => ({
      dungeonId,
      selectedDifficulty:
        profile.unlockedDifficultiesByDungeon[dungeonId].includes(current.selectedDifficulty)
          ? current.selectedDifficulty
          : profile.unlockedDifficultiesByDungeon[dungeonId][0],
      unlockedDifficulties: profile.unlockedDifficultiesByDungeon[dungeonId],
    }))
  }, [profile.unlockedDifficultiesByDungeon, selected.dungeonId])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const game = new PixelKnightGame(host, {
      onHud: (state) => {
        minimapPlayerCellStore.set(state.playerCell)
        setHud(state)
      },
      onMinimapPlayerCell: (cell) => minimapPlayerCellStore.set(cell),
      onHotspotInteract: (hotspot: MapHotspot) => {
        setInventoryOpen(false)
        setSettingsOpen(false)
        setActiveVillagePanel(hotspot.kind)
      },
      onPickupGold: (amount) => {
        updateActiveProfile((current) => ({ ...current, gold: current.gold + amount }))
      },
      onPickupItem: (item) => {
        const currentProfile = saveRef.current.profilesByClassId[saveRef.current.activeClassId]
        if (currentProfile.stash.length >= BACKPACK_VISIBLE_CAPACITY) return false
        updateActiveProfile((current) => ({ ...current, stash: [item, ...current.stash] }))
        return true
      },
      onRunComplete: (result) => {
        updateActiveProfile((current) => applyPixelKnightRunResult(current, result))
        setPhase('home')
        setHomeStage('village')
        setInventoryOpen(false)
        setSettingsOpen(false)
        setActiveVillagePanel(null)
      },
      onError: (message) => {
        setLoadError(message)
        setPhase('error')
      },
    })
    gameRef.current = game
    game.bootstrap()
    return () => {
      game.dispose()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setPhase('loading')
      setLoadError(null)
      setPreload(initialPreload)
      try {
        await preloadPixelKnightAssets((progress) => {
          if (!cancelled) setPreload(progress)
        })
        if (cancelled) return
        gameRef.current?.invalidateVillageTerrainCache()
        updateActiveProfile((current) => ({ ...current, hasCompletedInitialLoad: true }))
        setHomeStage('character')
        setPhase('home')
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : '预载失败')
        setPhase('error')
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [])

  const playerStats = useMemo(() => derivePixelKnightStats(profile), [profile])
  const gameEquipment = useMemo(() => resolveProfileMatrixEquipment(profile), [profile])

  useEffect(() => {
    gameRef.current?.setEquipment(gameEquipment)
  }, [gameEquipment])

  const startRun = () => {
    const didStart = gameRef.current?.startRun({
      dungeonId: selected.dungeonId,
      difficulty: selected.selectedDifficulty,
      stats: playerStats,
      equipment: gameEquipment,
    })
    if (!didStart) return
    setPhase('playing')
    setActiveVillagePanel(null)
    setInventoryOpen(false)
  }

  const retryPreload = () => {
    clearPixelKnightPreloadCache()
    setLoadError(null)
    setPhase('loading')
    setPreload(initialPreload)
    void preloadPixelKnightAssets((progress) => setPreload(progress))
      .then(() => {
        gameRef.current?.invalidateVillageTerrainCache()
        updateActiveProfile((current) => ({ ...current, hasCompletedInitialLoad: true }))
        setHomeStage('character')
        setPhase('home')
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : '预载失败')
        setPhase('error')
      })
  }

  const equipItem = (item: ItemInstance) => {
    updateActiveProfile((current) => {
      const existing = current.equipment[item.slot] ?? null
      return {
        ...current,
        equipment: {
          ...current.equipment,
          [item.slot]: item,
        },
        stash: [existing, ...current.stash.filter((candidate) => candidate.id !== item.id)].filter(
          Boolean,
        ) as ItemInstance[],
      }
    })
  }

  const unequipItem = (slot: EquipmentSlot) => {
    updateActiveProfile((current) => {
      const existing = current.equipment[slot] ?? null
      if (!existing) return current
      return {
        ...current,
        equipment: {
          ...current.equipment,
          [slot]: null,
        },
        stash: [...current.stash, existing],
      }
    })
  }

  const moveBackpackItemToStorage = (item: ItemInstance) => {
    updateActiveProfile((current) => {
      if (current.storage.length >= STORAGE_CAPACITY) return current
      if (!current.stash.some((candidate) => candidate.id === item.id)) return current
      return {
        ...current,
        stash: current.stash.filter((candidate) => candidate.id !== item.id),
        storage: [item, ...current.storage].slice(0, STORAGE_CAPACITY),
      }
    })
  }

  const moveStorageItemToBackpack = (item: ItemInstance) => {
    updateActiveProfile((current) => {
      if (current.stash.length >= BACKPACK_VISIBLE_CAPACITY) return current
      if (!current.storage.some((candidate) => candidate.id === item.id)) return current
      return {
        ...current,
        stash: [item, ...current.stash],
        storage: current.storage.filter((candidate) => candidate.id !== item.id),
      }
    })
  }

  const backToHome = () => {
    gameRef.current?.stopToHome()
    setHomeStage('village')
    setPhase('home')
    setInventoryOpen(false)
    setSettingsOpen(false)
    setActiveVillagePanel(null)
  }

  const confirmKnightSelection = () => {
    const nextProfile: PixelKnightCharacterProfile = {
      ...profile,
      equipment: {
        ...profile.equipment,
        mainHand: profile.equipment.mainHand ?? createStarterSword(),
        offHand: profile.equipment.offHand ?? createStarterShield(),
      },
    }
    updateActiveProfile(() => nextProfile)
    gameRef.current?.enterVillage({
      stats: derivePixelKnightStats(nextProfile),
      equipment: resolveProfileMatrixEquipment(nextProfile),
    })
    setHomeStage('village')
    setActiveVillagePanel(null)
  }

  const showingCharacterSelect = phase === 'home' && homeStage === 'character'
  const usingCharacterSelectFrame = showingCharacterSelect || phase === 'loading' || phase === 'error'

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(248,226,164,0.86),transparent_26%),linear-gradient(180deg,#f8ebc4_0%,#cedfba_38%,#769f7f_100%)] px-4 py-5 pb-28 text-[#142218] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#516c4f] uppercase">Pixel Knight</div>
            <h1 className="mt-1 text-[clamp(2.1rem,10vw,4.2rem)] leading-none font-black tracking-[0.08em] whitespace-nowrap text-[#183022] uppercase">
              像素骑士
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games')}
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <ArrowLeft />
              返回
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/character-demo">
                <Swords />
                角色
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/monsters">
                <Bug />
                怪物
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/map-editor">
                <Map />
                地图
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/data">
                <Database />
                数据后台
              </Link>
            </Button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#2c4d39]/16 bg-[#1c261f]/95 text-[#f5eed5] shadow-[0_24px_90px_rgba(27,34,28,0.22)]">
          <div
            className={cn(
              'relative bg-[#121714]',
              usingCharacterSelectFrame ? 'aspect-[1672/941]' : 'aspect-[16/10] min-h-[420px]',
            )}
          >
            <div ref={hostRef} className="absolute inset-0" />

            {(phase === 'loading' || phase === 'error') && (
              <LoadingOverlay progress={preload} error={loadError} onRetry={retryPreload} />
            )}

            {showingCharacterSelect ? (
              <div className="absolute inset-0 z-30 overflow-hidden bg-[#7ec1e7]">
                <img
                  src={characterSelectBg}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                  style={{ imageRendering: 'pixelated' }}
                />

                <div className="absolute left-0 right-0 top-0">
                  <img
                    src={titleBarFrame}
                    alt=""
                    className="h-auto w-full select-none"
                    draggable={false}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center pb-[0.4%] text-[min(4.2rem,4.1vw)] font-black tracking-[0.14em] text-[#ffe88c]"
                    style={{ textShadow: '0 3px 0 #18120d, 3px 0 0 #18120d, -3px 0 0 #18120d, 0 -3px 0 #18120d' }}
                  >
                    选择角色
                  </div>
                </div>

                  <div className="absolute left-[19.3%] top-[34%] h-[41%] w-[35%]">
                  <CharacterSelectKnightCanvas equipment={resolveProfileMatrixEquipment(profile)} />
                </div>

                <div className="absolute right-[1.2%] top-[21.5%] flex w-[33.2%] flex-col gap-[0.75vw]">
                  {characterSelectEntries.map((entry) => {
                    const classId = entry.classId
                    const selectedClass = classId != null && save.activeClassId === classId
                    const isEmptySlot = classId == null
                    const frame = selectedClass ? characterCardSelectedFrame : characterCardNormalFrame
                    const entryProfile = classId ? save.profilesByClassId[classId] : null
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={isEmptySlot}
                        onClick={() =>
                          classId && setSave((current) => ({ ...current, activeClassId: classId }))
                        }
                        className={cn(
                          'group relative aspect-[896/253] w-full text-left outline-none transition duration-150',
                          isEmptySlot ? 'cursor-default' : 'hover:translate-x-[-1.5%] focus-visible:translate-x-[-1.5%]',
                        )}
                        aria-pressed={selectedClass}
                        aria-label={isEmptySlot ? '空角色槽' : `选择${entry.name}`}
                      >
                        <img
                          src={frame}
                          alt=""
                          className={cn(
                            'absolute inset-0 h-full w-full select-none object-fill',
                            !selectedClass && !isEmptySlot ? 'group-hover:hidden group-focus-visible:hidden' : null,
                          )}
                          draggable={false}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {!selectedClass && !isEmptySlot ? (
                          <img
                            src={characterCardFocusedFrame}
                            alt=""
                            className="absolute inset-0 hidden h-full w-full select-none object-fill group-hover:block group-focus-visible:block"
                            draggable={false}
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : null}
                        {!isEmptySlot ? (
                          <CharacterSelectAvatarCanvas
                            equipment={resolveProfileMatrixEquipment(entryProfile!)}
                          />
                        ) : null}
                        {!isEmptySlot ? (
                          <>
                            <div
                              className="absolute left-[31%] top-[24%] text-[min(1.8rem,1.8vw)] font-black leading-none text-[#16100c]"
                              style={{ textShadow: '0 2px 0 rgba(255,255,255,0.38)' }}
                            >
                              {entry.name}
                            </div>
                            <div className="absolute left-[31%] top-[58%] text-[min(1.35rem,1.32vw)] font-black leading-none text-[#14100d]">
                              Lv.{entryProfile?.level ?? 1}
                            </div>
                          </>
                        ) : null}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={confirmKnightSelection}
                  className="group absolute left-[24.2%] top-[80.4%] aspect-[417/119] w-[25.2%] outline-none transition duration-150 hover:translate-y-[-2%] active:translate-y-[1%] focus-visible:translate-y-[-2%]"
                >
                  <img
                    src={buttonPrimaryFrame}
                    alt=""
                    className="absolute inset-0 h-full w-full select-none object-fill group-active:hidden"
                    draggable={false}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <img
                    src={buttonDisabledFrame}
                    alt=""
                    className="absolute inset-0 hidden h-full w-full select-none object-fill group-active:block"
                    draggable={false}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span
                    className="absolute inset-0 flex items-center justify-center pb-[2%] text-[min(2.6rem,2.65vw)] font-black tracking-[0.08em] text-[#2b1708]"
                    style={{ textShadow: '0 2px 0 rgba(255,255,255,0.58)' }}
                  >
                    进入游戏
                  </span>
                </button>
              </div>
            ) : null}

            {phase === 'home' && homeStage === 'village' && activeVillagePanel === 'portal' ? (
              <OtherworldMapOverlay
                selectedDungeonId={selected.dungeonId}
                unlockedDifficultiesByDungeon={profile.unlockedDifficultiesByDungeon}
                availableDungeonIds={availableOtherworldDungeonIds}
                onSelectDungeon={(dungeonId) =>
                  setSelected({
                    dungeonId,
                    selectedDifficulty: profile.unlockedDifficultiesByDungeon[dungeonId][0],
                    unlockedDifficulties: profile.unlockedDifficultiesByDungeon[dungeonId],
                  })
                }
                onEnter={startRun}
                onClose={() => setActiveVillagePanel(null)}
              />
            ) : null}

            {phase === 'home' && homeStage === 'village' && activeVillagePanel === 'stash' ? (
              <StorageOverlay
                profile={profile}
                onClose={() => setActiveVillagePanel(null)}
                onMoveToStorage={moveBackpackItemToStorage}
                onMoveToBackpack={moveStorageItemToBackpack}
              />
            ) : null}

            {phase === 'home' && homeStage === 'village' && activeVillagePanel && activeVillagePanel !== 'portal' && activeVillagePanel !== 'stash' ? (
              <VillageSystemPanel
                kind={activeVillagePanel}
                profile={profile}
                playerStats={playerStats}
                onClose={() => setActiveVillagePanel(null)}
                onOpenInventory={() => {
                  setActiveVillagePanel(null)
                  setInventoryOpen(true)
                }}
              />
            ) : null}

            {(phase === 'home' && homeStage === 'village') || phase === 'playing' || hud.phase === 'paused' ? (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-4">
                  <HudHealth
                    state={hud}
                    fallbackMaxHealth={playerStats.maxHealth}
                    onOpenSettings={() => setSettingsOpen(true)}
                  />

                  <div className="flex items-start gap-2">
                    <div className="pointer-events-none relative aspect-square w-[clamp(7.25rem,14vw,13.5rem)] max-w-[calc(100vw-2rem)]">
                      <MiniMap hud={hud} />
                      <img
                        src={hudMinimapFrame}
                        alt=""
                        className="absolute inset-0 z-10 h-full w-full object-fill"
                        draggable={false}
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="absolute left-[24%] right-[24%] top-[5%] z-20 truncate text-center text-[clamp(0.58rem,0.95vw,0.75rem)] font-black tracking-[0.08em] text-[#2c1c0e]">
                        {hud.dungeonName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInventoryOpen((current) => !current)}
                      className="pointer-events-auto relative mt-[12px] h-14 w-14 transition hover:scale-105 active:scale-95"
                      aria-label="打开背包"
                    >
                      <img
                        src={hudBackpackButton}
                        alt=""
                        className="absolute inset-0 h-full w-full object-fill"
                        draggable={false}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </button>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
                  <div className="flex flex-col items-center gap-2">
                    {hud.mapKind === 'dungeon' ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {[
                        ['LMB', '斩击', hud.cooldowns.basic],
                        ['RMB', '旋风', hud.cooldowns.whirlwind],
                        ['Q', '盾击', hud.cooldowns.shield],
                        ['E', '突进', hud.cooldowns.holy],
                        ['R', '祝福', hud.cooldowns.blessing],
                        ['Space', '闪避', hud.cooldowns.dodge],
                      ].map(([key, label, cd]) => (
                        <div
                          key={key}
                          className="rounded-[1.05rem] border border-white/10 bg-black/34 px-3 py-2 text-center backdrop-blur-[2px]"
                        >
                          <div className="text-[0.68rem] tracking-[0.18em] text-[#b8ccaf] uppercase">{key}</div>
                          <div className="mt-1 text-sm font-semibold text-[#fbf5db]">{label}</div>
                          <div className="mt-1 text-xs text-[#d8cba4]">{Number(cd) > 0 ? `${Math.ceil(Number(cd) / 100) / 10}s` : 'Ready'}</div>
                        </div>
                      ))}
                    </div> : null}
                  </div>
                </div>
              </>
            ) : null}

            {inventoryOpen ? (
              <InventoryOverlay
                profile={profile}
                playerStats={playerStats}
                onClose={() => setInventoryOpen(false)}
                onEquipItem={equipItem}
                onUnequipItem={unequipItem}
              />
            ) : null}

            {settingsOpen ? (
              <SettingsOverlay
                onClose={() => setSettingsOpen(false)}
                onBackToCharacterSelect={() => {
                  gameRef.current?.stopToHome()
                  setPhase('home')
                  setHomeStage('character')
                  setInventoryOpen(false)
                  setSettingsOpen(false)
                  setActiveVillagePanel(null)
                }}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function SettingsOverlay({
  onClose,
  onBackToCharacterSelect,
}: {
  onClose: () => void
  onBackToCharacterSelect: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#11150f]/82 p-3 text-[#f7ecd0] sm:p-5">
      <img
        src={inventoryBgFrame}
        alt=""
        className="absolute left-[2%] top-[3%] h-[94%] w-[96%] object-fill opacity-95"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />

      <div className="relative h-full w-full">
        <div className="absolute left-[7%] top-[6%] text-lg font-black tracking-[0.18em] text-[#f6dfac] sm:text-2xl">
          配置
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-[5%] top-[6%] z-10 h-11 w-11 transition hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          aria-label="关闭配置"
        >
          <img
            src={closeButtonFrame}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
        </button>

        <div className="absolute left-[8%] right-[8%] top-[18%] bottom-[10%] grid place-items-center">
          <Button
            type="button"
            onClick={onBackToCharacterSelect}
            className="h-12 w-full max-w-sm rounded-full bg-[#f3d48f] text-[#2e2414] hover:bg-[#ffe2a6]"
          >
            返回主菜单
          </Button>
        </div>
      </div>
    </div>
  )
}

function VillageSystemPanel({
  kind,
  profile,
  playerStats,
  onClose,
  onOpenInventory,
}: {
  kind: VillageHotspotKind
  profile: PixelKnightCharacterProfile
  playerStats: ReturnType<typeof derivePixelKnightStats>
  onClose: () => void
  onOpenInventory: () => void
}) {
  const content: Record<VillageHotspotKind, { title: string; eyebrow: string; body: string; action?: string }> = {
    portal: { title: '传送门', eyebrow: 'Portal', body: '选择副本入口。' },
    shop: {
      title: '旅店商铺',
      eyebrow: 'Shop',
      body: `店主把基础补给摆在最显眼的位置。你现在有 ${profile.gold} 金币；完整购买与回购系统下一阶段接入。`,
      action: '查看背包',
    },
    stash: {
      title: '储藏箱',
      eyebrow: 'Stash',
      body: `仓库已接入当前存档，共有 ${profile.stash.length} 件暂存战利品。`,
      action: '打开仓库',
    },
    blacksmith: {
      title: '铁匠铺',
      eyebrow: 'Blacksmith',
      body: `铁砧边还留着余温。当前攻击 ${playerStats.attack}、护甲 ${playerStats.armor}；强化系统先保留入口。`,
    },
    'notice-board': {
      title: '公告板',
      eyebrow: 'Notice',
      body: '村里的第一条告示：沿北侧主路前往传送门，完成晨曦草原探索后带回战利品。',
    },
    gemsmith: {
      title: '宝石匠',
      eyebrow: 'Gemsmith',
      body: '镶嵌和宝石系统已预留站位，等装备循环更完整后开放。',
    },
  }
  const panel = content[kind]

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[linear-gradient(180deg,rgba(23,32,22,0.28),rgba(9,12,9,0.68))] p-4">
      <div className="w-full max-w-md rounded-[1.8rem] border border-[#f3d48f]/16 bg-[#172019]/94 p-5 text-[#f7f0d5] shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.3em] text-[#efd9a2]/72 uppercase">{panel.eyebrow}</div>
            <h2 className="mt-2 text-3xl font-black tracking-[0.06em]">{panel.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-[#d6dfcd]"
          >
            关闭
          </button>
        </div>
        <p className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-[#e4dcc0]">
          {panel.body}
        </p>
        {panel.action ? (
          <Button
            type="button"
            onClick={onOpenInventory}
            className="mt-4 h-11 rounded-full bg-[#f3d48f] px-5 text-[#2e2414] hover:bg-[#ffe2a6]"
          >
            {panel.action}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function HudHealth({
  state,
  fallbackMaxHealth,
  onOpenSettings,
}: {
  state: PixelKnightHudState
  fallbackMaxHealth: number
  onOpenSettings: () => void
}) {
  const maxHealth = state.maxHealth || fallbackMaxHealth
  const health = state.maxHealth ? state.health : maxHealth
  const ratio = maxHealth ? Math.max(0, Math.min(1, health / maxHealth)) : 0

  return (
    <div className="relative aspect-[22/7] w-[clamp(13.75rem,29vw,22rem)] max-w-[calc(100vw-2rem)]">
      <img
        src={hudHealthFrame}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-fill"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      <button
        type="button"
        onClick={onOpenSettings}
        className="peer pointer-events-auto absolute left-[6%] top-[14%] z-40 aspect-square w-[22%] rounded-[0.6rem]"
        aria-label="打开配置"
      />
      <img
        src={hudKnightPortrait}
        alt=""
        className="absolute left-[5%] top-[18%] z-[25] h-[65%] w-[22%] origin-center object-contain transition-transform duration-150 ease-out peer-hover:scale-105 peer-focus-visible:scale-105"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute left-[33.84%] right-[5.18%] top-[24.6%] z-10 h-[26.19%] overflow-hidden">
        <img
          src={hudHpFill}
          alt=""
          className="h-full w-full object-fill"
          draggable={false}
          style={{
            clipPath: `inset(0 ${100 - ratio * 100}% 0 0)`,
            imageRendering: 'pixelated',
          }}
        />
      </div>
      <div className="absolute left-[33.84%] right-[5.18%] top-[60.71%] z-10 h-[22.22%] overflow-hidden">
        <img
          src={hudBlueFill}
          alt=""
          className="h-full max-w-none object-fill"
          draggable={false}
          style={{ width: '100%', imageRendering: 'pixelated' }}
        />
      </div>
      <img
        src={hudHealthFrameFront}
        alt=""
        className="absolute inset-0 z-20 h-full w-full object-fill"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute left-[33.84%] right-[5.18%] top-[30.8%] z-30 flex h-[14%] items-center justify-center text-[clamp(0.48rem,0.95vw,0.75rem)] font-black tracking-[0.08em] text-[#fff2c8]">
        HP {Math.max(0, Math.round(health))}/{Math.round(maxHealth)}
      </div>
      <div className="absolute left-[33.84%] right-[5.18%] top-[66.5%] z-30 flex h-[14%] items-center justify-center text-[clamp(0.48rem,0.95vw,0.75rem)] font-black tracking-[0.08em] text-[#d8f6ff]">
        MP 100/100
      </div>
    </div>
  )
}

function StorageOverlay({
  profile,
  onClose,
  onMoveToStorage,
  onMoveToBackpack,
}: {
  profile: PixelKnightCharacterProfile
  onClose: () => void
  onMoveToStorage: (item: ItemInstance) => void
  onMoveToBackpack: (item: ItemInstance) => void
}) {
  const storageCells = Array.from({ length: STORAGE_CAPACITY }, (_, index) => profile.storage[index] ?? null)
  const backpackCells = Array.from({ length: BACKPACK_VISIBLE_CAPACITY }, (_, index) => profile.stash[index] ?? null)
  const backpackFull = profile.stash.length >= BACKPACK_VISIBLE_CAPACITY
  const storageFull = profile.storage.length >= STORAGE_CAPACITY

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#11150f]/82 p-3 text-[#f7ecd0] sm:p-5">
      <img
        src={inventoryBgFrame}
        alt=""
        className="absolute left-[2%] top-[3%] h-[94%] w-[96%] object-fill opacity-95"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />

      <div className="relative h-full w-full">
        <div className="absolute left-[7%] top-[6%] text-lg font-black tracking-[0.18em] text-[#f6dfac] sm:text-2xl">
          储物箱
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-[5%] top-[6%] z-10 h-11 w-11 transition hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          aria-label="关闭储物箱"
        >
          <img
            src={closeButtonFrame}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
        </button>

        <section className="absolute left-[5%] top-[20%] h-[66%] w-[34%]">
          <div className="mb-2 flex items-center justify-between px-2 text-xs font-black tracking-[0.16em] text-[#f1d99d] sm:text-sm">
            <span>箱子</span>
            <span className={storageFull ? 'text-[#ffb38d]' : 'text-[#d9c391]'}>{profile.storage.length}/{STORAGE_CAPACITY}</span>
          </div>
          <img
            src={inventoryGridPanel}
            alt=""
            className="absolute inset-x-0 bottom-0 h-[calc(100%-1.75rem)] w-full object-fill"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute left-[9%] right-[9%] top-[13%] bottom-[9%] grid grid-cols-6 grid-rows-6 gap-[1.5%]">
            {storageCells.map((item, index) => (
              <StorageItemCell
                key={item?.id ?? `storage-empty-${index}`}
                item={item}
                actionLabel="取出"
                disabled={Boolean(item) && backpackFull}
                onClick={onMoveToBackpack}
              />
            ))}
          </div>
        </section>

        <section className="absolute right-[5%] top-[20%] h-[66%] w-[34%]">
          <div className="mb-2 flex items-center justify-between px-2 text-xs font-black tracking-[0.16em] text-[#f1d99d] sm:text-sm">
            <span>背包</span>
            <span className={backpackFull ? 'text-[#ffb38d]' : 'text-[#d9c391]'}>{profile.stash.length}/{BACKPACK_VISIBLE_CAPACITY}</span>
          </div>
          <img
            src={inventoryGridPanel}
            alt=""
            className="absolute inset-x-0 bottom-0 h-[calc(100%-1.75rem)] w-full object-fill"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute left-[9%] right-[9%] top-[13%] bottom-[9%] grid grid-cols-6 grid-rows-6 gap-[1.5%]">
            {backpackCells.map((item, index) => (
              <StorageItemCell
                key={item?.id ?? `backpack-empty-${index}`}
                item={item}
                actionLabel="存入"
                disabled={Boolean(item) && storageFull}
                onClick={onMoveToStorage}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function StorageItemCell({
  item,
  actionLabel,
  disabled,
  onClick,
}: {
  item: ItemInstance | null
  actionLabel: string
  disabled: boolean
  onClick: (item: ItemInstance) => void
}) {
  if (!item) return <div className="relative" />

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(item)}
      className="group relative min-h-0 disabled:cursor-not-allowed disabled:opacity-55"
      aria-label={`${actionLabel}${item.name}`}
    >
      <span className="pointer-events-none absolute inset-[2px] hidden border-2 border-[#ffd36d] group-hover:block group-focus-visible:block" />
      <MatrixEquipmentPreview item={item} className="absolute inset-[16%] h-[68%] w-[68%]" />
      <div className="absolute bottom-[4%] right-[10%] text-[0.48rem] font-black text-[#f3dfb5] sm:text-[0.58rem]">
        {item.itemLevel}
      </div>
      <EquipmentTooltip item={item} slot={item.slot} />
    </button>
  )
}

function HomeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-[0.68rem] tracking-[0.22em] text-[#c8d7c8] uppercase">{label}</div>
      <div className="mt-1 text-lg font-black text-[#fbf4dd]">{value}</div>
    </div>
  )
}

function InventoryOverlay({
  profile,
  playerStats,
  onClose,
  onEquipItem,
  onUnequipItem,
}: {
  profile: PixelKnightCharacterProfile
  playerStats: ReturnType<typeof derivePixelKnightStats>
  onClose: () => void
  onEquipItem: (item: ItemInstance) => void
  onUnequipItem: (slot: EquipmentSlot) => void
}) {
  const inventoryCells = Array.from({ length: BACKPACK_VISIBLE_CAPACITY }, (_, index) => profile.stash[index] ?? null)
  const stats: Array<[string, string | number, string]> = [
    ['攻击', playerStats.attack, statAttackIcon],
    ['护甲', playerStats.armor, statArmorIcon],
    ['生命', playerStats.maxHealth, statHealthIcon],
    ['暴击', `${Math.round(playerStats.critChance * 100)}%`, statCritChanceIcon],
    ['暴伤', `${Math.round(playerStats.critDamage * 100)}%`, statCritDamageIcon],
    ['技能', playerStats.skillPower, statSkillIcon],
    ['移速', playerStats.moveSpeed, statMoveSpeedIcon],
    ['金币', profile.gold, statGoldIcon],
  ]

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#11150f]/82 p-3 text-[#f7ecd0] sm:p-5">
      <img
        src={inventoryBgFrame}
        alt=""
        className="absolute left-[2%] top-[3%] h-[94%] w-[96%] object-fill opacity-95"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />

      <div className="relative h-full w-full">
        <div className="absolute left-[7%] top-[6%] text-lg font-black tracking-[0.18em] text-[#f6dfac] sm:text-2xl">
          骑士背包
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-[5%] top-[6%] z-10 h-11 w-11 transition hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          aria-label="关闭背包"
        >
          <img
            src={closeButtonFrame}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
        </button>

        <div className="absolute left-[6%] top-[16%] h-[63%] w-[55%]">
          <InventoryCharacterCanvas profile={profile} />
          {equipmentSlotOrder.map((slot) => (
            <EquipmentSlotButton
              key={slot}
              slot={slot}
              item={profile.equipment[slot] ?? null}
              onUnequipItem={onUnequipItem}
            />
          ))}
        </div>

        <div className="absolute left-[12.5%] top-[70%] grid w-[42%] grid-cols-4 gap-x-1.5 gap-y-1 text-[#f3dfb5] lg:gap-x-2 lg:gap-y-1.5">
          {stats.map(([label, value, icon]) => (
            <div key={label} className="flex min-w-0 items-center gap-1 lg:gap-1.5">
              <img
                src={icon}
                alt=""
                className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7"
                draggable={false}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="min-w-0">
                <div className="truncate text-[0.48rem] font-black tracking-[0.08em] text-[#c2a778] sm:text-[0.56rem] lg:text-[0.68rem] xl:text-xs">{label}</div>
                <div className="truncate text-[0.66rem] font-black leading-none sm:text-xs lg:text-sm xl:text-base">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="absolute right-[5%] top-[20%] h-[68%] w-[33%]">
          <img
            src={inventoryGridPanel}
            alt=""
            className="absolute inset-0 h-full w-full object-fill"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute left-[9%] right-[9%] top-[9%] bottom-[9%] grid grid-cols-6 grid-rows-6 gap-[1.5%]">
            {inventoryCells.map((item, index) => (
              <InventoryItemCell
                key={item?.id ?? `empty-${index}`}
                item={item}
                onEquipItem={onEquipItem}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function EquipmentSlotButton({
  slot,
  item,
  onUnequipItem,
}: {
  slot: EquipmentSlot
  item: ItemInstance | null
  onUnequipItem: (slot: EquipmentSlot) => void
}) {
  const positions: Record<EquipmentSlot, string> = {
    amulet: 'left-[9%] top-[10%]',
    ring: 'left-[9%] top-[35%]',
    mainHand: 'left-[9%] top-[60%]',
    helmet: 'left-[75%] top-[10%]',
    armor: 'left-[75%] top-[35%]',
    offHand: 'left-[75%] top-[60%]',
    gloves: 'left-0 top-0',
    boots: 'left-0 top-0',
  }

  return (
    <button
      type="button"
      onClick={() => item && onUnequipItem(slot)}
      disabled={!item}
      className={cn(
        'group absolute aspect-square w-[14%] min-w-[52px] disabled:cursor-default',
        positions[slot],
      )}
      aria-label={item ? `卸下${item.name}` : `${slotLabel(slot)}未装备`}
    >
      <img
        src={inventorySlotFrame}
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      {item ? (
        <MatrixEquipmentPreview item={item} className="absolute inset-[18%] h-[64%] w-[64%]" />
      ) : (
        <EquipmentSlotPlaceholder slot={slot} />
      )}
      {item ? (
        <span className="absolute inset-0 hidden border-2 border-[#ffd36d] group-hover:block group-focus-visible:block" />
      ) : null}
      {item ? <EquipmentTooltip item={item} slot={slot} /> : null}
    </button>
  )
}

function EquipmentSlotPlaceholder({ slot }: { slot: EquipmentSlot }) {
  const placeholderBySlot: Partial<Record<EquipmentSlot, string>> = {
    helmet: placeholderHelmetIcon,
    armor: placeholderArmorIcon,
    mainHand: placeholderMainHandIcon,
    offHand: placeholderOffHandIcon,
    amulet: placeholderAmuletIcon,
    ring: placeholderRingIcon,
  }

  return (
    <img
      src={placeholderBySlot[slot] ?? placeholderAmuletIcon}
      alt=""
      className="pointer-events-none absolute inset-[19%] h-[62%] w-[62%] object-contain opacity-80"
      draggable={false}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function EquipmentTooltip({ item, slot }: { item: ItemInstance; slot: EquipmentSlot }) {
  const statLine = pixelKnightItemStatLine(item)

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30 hidden w-44 -translate-x-1/2 -translate-y-[108%] border-2 border-[#6f4b27] bg-[#21170f]/95 px-3 py-2 text-left shadow-[0_6px_0_rgba(20,10,4,0.45)] group-hover:block group-focus-visible:block">
      <div className="truncate text-sm font-black text-[#ffe0a3]">{item.name}</div>
      <div className="mt-1 text-[0.58rem] font-black tracking-[0.12em] text-[#bfa06d] uppercase">
        {slotLabel(slot)} · Lv.{item.itemLevel} · {rarityLabel(item.rarity)}
      </div>
      {statLine ? <div className="mt-2 text-xs font-bold leading-snug text-[#f4d7a0]">{statLine}</div> : null}
    </div>
  )
}

function MatrixEquipmentPreview({ item, className }: { item: ItemInstance; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const piece = resolveMatrixEquipment(item)
    if (!canvas || !piece) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const entries = piece.parts
      ? Object.values(piece.parts).sort((a, b) => {
          const rank = (layer?: 'back' | 'base' | 'front') => (layer === 'back' ? 0 : layer === 'front' ? 2 : 1)
          return rank(a.layer) - rank(b.layer)
        })
      : piece.size && piece.points
        ? [{ size: piece.size, points: piece.points }]
        : []
    if (!entries.length) return

    const width = Math.max(...entries.map((entry) => entry.size[0]))
    const height = Math.max(...entries.map((entry) => entry.size[1]))
    const pixel = Math.max(2, Math.floor(56 / Math.max(width, height)))
    canvas.width = width * pixel
    canvas.height = height * pixel
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    for (const entry of entries) {
      for (const point of entry.points) {
        ctx.fillStyle = point.color
        ctx.fillRect(point.x * pixel, point.y * pixel, pixel, pixel)
      }
    }
  }, [item])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none object-contain', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function InventoryItemCell({
  item,
  onEquipItem,
}: {
  item: ItemInstance | null
  onEquipItem: (item: ItemInstance) => void
}) {
  if (!item) return <div className="relative" />

  return (
    <button
      type="button"
      onClick={() => onEquipItem(item)}
      className="group relative min-h-0"
      aria-label={`装备${item.name}`}
    >
      <span className="absolute -top-[calc(2%+3px)] bottom-[2%] left-[calc(2%-2px)] right-[2%] hidden border-2 border-[#ffd36d] group-hover:block group-focus-visible:block" />
      <MatrixEquipmentPreview item={item} className="absolute inset-[16%] h-[68%] w-[68%]" />
      <div className="absolute bottom-[4%] right-[10%] text-[0.48rem] font-black text-[#f3dfb5] sm:text-[0.58rem]">
        {item.itemLevel}
      </div>
      <EquipmentTooltip item={item} slot={item.slot} />
    </button>
  )
}

const MiniMapStaticLayer = memo(function MiniMapStaticLayer({
  rows,
  hotspots,
  portalCell,
}: {
  rows: string[]
  hotspots: MapHotspot[]
  portalCell: MinimapCell
}) {
  if (!rows.length) return null
  return (
    <>
      <rect x="0" y="0" width={rows[0].length} height={rows.length} fill="#91c76d" />
      {rows.map((row, y) =>
        row.split('').map((cell, x) => {
          const fill =
            cell === '#'
              ? '#33473a'
              : cell === 'p'
                ? '#e5cf8f'
                : cell === 'r'
                  ? '#b8814d'
                  : cell === 'P'
                    ? '#7ae4ff'
                    : '#9acb6c'
          return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
        }),
      )}
      {hotspots.map((hotspot) => (
        <rect
          key={hotspot.id}
          x={hotspot.cell.x}
          y={hotspot.cell.y}
          width="1"
          height="1"
          fill={hotspot.kind === 'portal' ? '#7ae4ff' : '#ffd56f'}
        />
      ))}
      <rect x={portalCell.x} y={portalCell.y} width="1" height="1" fill="#7ae4ff" />
    </>
  )
})

function MiniMapPlayerMarker({ fallbackCell }: { fallbackCell: MinimapCell }) {
  const storeCell = useSyncExternalStore(
    minimapPlayerCellStore.subscribe,
    minimapPlayerCellStore.getSnapshot,
    minimapPlayerCellStore.getSnapshot,
  )
  const cell = storeCell ?? fallbackCell
  return (
    <g>
      <circle cx={cell.x + 0.5} cy={cell.y + 0.5} r="2.2" fill="rgba(29, 19, 7, 0.72)" />
      <circle cx={cell.x + 0.5} cy={cell.y + 0.5} r="1.55" fill="#ffdc47" stroke="#fff4b0" strokeWidth="0.45" />
      <rect x={cell.x + 0.18} y={cell.y + 0.18} width="0.64" height="0.64" fill="#5b3106" />
    </g>
  )
}

function MiniMap({ hud }: { hud: PixelKnightHudState }) {
  const rows = hud.minimapRows
  const mapWindowClass = 'absolute left-[7.2%] right-[7.2%] top-[18.6%] bottom-[6.6%] z-0 overflow-hidden bg-[#91c76d]'
  if (!rows.length) return <div className={mapWindowClass} />

  return (
    <div className={mapWindowClass}>
      <svg
        viewBox={`0 0 ${rows[0].length} ${rows.length}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <MiniMapStaticLayer rows={rows} hotspots={hud.hotspots} portalCell={hud.portalCell} />
        <MiniMapPlayerMarker fallbackCell={hud.playerCell} />
      </svg>
    </div>
  )
}
