import { useRef } from 'react'

type DirectionInput = { up: boolean; down: boolean; left: boolean; right: boolean }

interface TouchControlsProps {
  onMoveChange: (next: DirectionInput) => void
  onFireChange: (firing: boolean) => void
  onPauseToggle?: () => void
  className?: string
}

const JOY_SIZE = 120
const KNOB_SIZE = 46

export function TouchControls({
  onMoveChange,
  onFireChange,
  onPauseToggle,
  className,
}: TouchControlsProps) {
  const dragIdRef = useRef<number | null>(null)

  function resetMovement() {
    onMoveChange({ up: false, down: false, left: false, right: false })
  }

  function computeDirection(host: HTMLDivElement, clientX: number, clientY: number) {
    const rect = host.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const mag = Math.hypot(dx, dy)
    const deadZone = 10

    if (mag <= deadZone) {
      resetMovement()
      return
    }

    const ax = Math.abs(dx)
    const ay = Math.abs(dy)
    onMoveChange({
      up: ay > ax && dy < -deadZone,
      down: ay > ax && dy > deadZone,
      left: ax >= ay && dx < -deadZone,
      right: ax >= ay && dx > deadZone,
    })
  }

  return (
    <div
      className={`mt-4 rounded-xl border border-[#5f5434]/80 bg-[#0b0d13]/85 px-3 pt-3 pb-2 shadow-[0_0_0_1px_#00000080] sm:px-4 ${className ?? ''}`}
      style={{ touchAction: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      aria-label="Touch controls"
    >
      <div className="flex items-end justify-between gap-4">
        <div
          className="relative shrink-0 rounded-full border border-[#5f5434] bg-[#1a1d27]/85"
          style={{ width: JOY_SIZE, height: JOY_SIZE, touchAction: 'none' }}
          onPointerDown={(event) => {
            const el = event.currentTarget
            dragIdRef.current = event.pointerId
            el.setPointerCapture(event.pointerId)
            computeDirection(el, event.clientX, event.clientY)
          }}
          onPointerMove={(event) => {
            if (dragIdRef.current !== event.pointerId) return
            computeDirection(event.currentTarget, event.clientX, event.clientY)
          }}
          onPointerUp={(event) => {
            if (dragIdRef.current !== event.pointerId) return
            event.currentTarget.releasePointerCapture(event.pointerId)
            dragIdRef.current = null
            resetMovement()
          }}
          onPointerCancel={(event) => {
            if (dragIdRef.current !== event.pointerId) return
            event.currentTarget.releasePointerCapture(event.pointerId)
            dragIdRef.current = null
            resetMovement()
          }}
          role="application"
          aria-label="Virtual joystick"
        >
          <div
            className="absolute rounded-full border border-[#8f7e4f] bg-[#2b3247]/90"
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              left: (JOY_SIZE - KNOB_SIZE) / 2,
              top: (JOY_SIZE - KNOB_SIZE) / 2,
            }}
          />
        </div>
        <div className="ml-auto flex min-w-[124px] flex-col items-end justify-end gap-2">
          {onPauseToggle ? (
            <button
              type="button"
              className="h-11 min-w-20 rounded-full border border-[#5f5434] bg-[#2d2534] px-4 font-mono text-[11px] tracking-[0.06em] text-[#f0dca2]"
              onClick={onPauseToggle}
              aria-label="Pause game"
            >
              PAUSE
            </button>
          ) : null}
          <button
            type="button"
            className="h-20 min-w-20 rounded-full border border-[#5f5434] bg-[#5c2a2a] px-4 font-mono text-xs tracking-[0.08em] text-[#f8e8b8]"
            onPointerDown={(event) => {
              onFireChange(true)
            }}
            onPointerUp={(event) => {
              void event
              onFireChange(false)
            }}
            onPointerCancel={(event) => {
              void event
              onFireChange(false)
            }}
            aria-label="Touch fire"
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  )
}
