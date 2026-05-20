export type StarTripInputState = {
  moveX: number
  moveY: number
  run: boolean
  jumpHeld: boolean
}

const movementKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'ShiftLeft',
  'ShiftRight',
])

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export class InputController {
  private readonly keys = new Set<string>()
  private jumpQueued = false

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp, { passive: false })
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  getState(): StarTripInputState {
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA')
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD')
    const up = this.keys.has('ArrowUp') || this.keys.has('KeyW')
    const down = this.keys.has('ArrowDown') || this.keys.has('KeyS')
    return {
      moveX: Number(right) - Number(left),
      moveY: Number(up) - Number(down),
      run: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      jumpHeld: this.keys.has('Space'),
    }
  }

  consumeJumpPressed() {
    const pressed = this.jumpQueued
    this.jumpQueued = false
    return pressed
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (isInteractiveTarget(event.target)) return
    if (!movementKeys.has(event.code)) return
    event.preventDefault()
    if (event.code === 'Space' && !event.repeat) this.jumpQueued = true
    this.keys.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (isInteractiveTarget(event.target)) return
    if (!movementKeys.has(event.code)) return
    event.preventDefault()
    this.keys.delete(event.code)
  }
}
