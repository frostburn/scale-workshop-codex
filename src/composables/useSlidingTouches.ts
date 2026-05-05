import { LEFT_MOUSE_BTN } from '@/constants'
import type { NoteOnCallback } from '@/types'

type SlidingKey = { id: string; index: number }
type KeyFromElement = (element: Element | null) => SlidingKey | undefined

type UseSlidingTouchesOptions = {
  slideEnabled: () => boolean
  getKeyFromElement: KeyFromElement
  noteOn: NoteOnCallback
  onBend?: (value: number) => void
  bendDragPixels?: number
  bendDeadZonePixels?: number
}

export function useSlidingTouches(options: UseSlidingTouchesOptions) {
  const activeTouchKeys = new Map<number, SlidingKey>()
  const activeTouchPositions = new Map<number, { x: number; y: number }>()
  const keyPressCounts = new Map<string, number>()
  const noteOffs = new Map<string, () => void>()
  const bendDragPixels = options.bendDragPixels ?? 200
  const bendDeadZonePixels = options.bendDeadZonePixels ?? 16

  let isMousePressed = false
  let activeMouseKey: SlidingKey | null = null
  let mouseStartY: number | null = null
  let touchStartCentroidY: number | null = null

  function applyBendFromDelta(delta: number) {
    if (!options.onBend) return
    const absDelta = Math.abs(delta)
    if (absDelta <= bendDeadZonePixels) {
      options.onBend(0)
      return
    }
    const normalized = (absDelta - bendDeadZonePixels) / (bendDragPixels - bendDeadZonePixels)
    options.onBend(Math.sign(delta) * Math.max(0, Math.min(1, normalized)))
  }

  function touchCentroidY() {
    if (!activeTouchPositions.size) return null
    let sum = 0
    activeTouchPositions.forEach(({ y }) => {
      sum += y
    })
    return sum / activeTouchPositions.size
  }

  function activateKey(key: SlidingKey) {
    const keyId = key.id
    const activeCount = keyPressCounts.get(keyId) ?? 0
    if (activeCount === 0) {
      noteOffs.set(keyId, options.noteOn(key.index))
    }
    keyPressCounts.set(keyId, activeCount + 1)
  }

  function releaseKey(key: SlidingKey) {
    const keyId = key.id
    const activeCount = keyPressCounts.get(keyId) ?? 0
    if (activeCount <= 1) {
      keyPressCounts.delete(keyId)
      const noteOff = noteOffs.get(keyId)
      if (noteOff) {
        noteOff()
        noteOffs.delete(keyId)
      }
      return
    }
    keyPressCounts.set(keyId, activeCount - 1)
  }

  function isKeyActive(key: SlidingKey) {
    return (keyPressCounts.get(key.id) ?? 0) > 0
  }

  function onTouchStart(event: TouchEvent, key: SlidingKey) {
    event.preventDefault()
    for (const touch of event.changedTouches) {
      if (!activeTouchKeys.has(touch.identifier)) {
        activeTouchKeys.set(touch.identifier, key)
        activeTouchPositions.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
        activateKey(key)
      }
    }
    if (!options.slideEnabled() && options.onBend && touchStartCentroidY === null) {
      touchStartCentroidY = touchCentroidY()
    }
  }

  function onTouchEnd(event: TouchEvent) {
    event.preventDefault()
    for (const touch of event.changedTouches) {
      const activeKey = activeTouchKeys.get(touch.identifier)
      if (activeKey !== undefined) {
        releaseKey(activeKey)
        activeTouchKeys.delete(touch.identifier)
        activeTouchPositions.delete(touch.identifier)
      }
    }
    if (!activeTouchKeys.size) {
      touchStartCentroidY = null
      options.onBend?.(0)
    }
  }

  function onTouchMove(event: TouchEvent) {
    event.preventDefault()
    if (options.slideEnabled()) {
      for (const touch of event.changedTouches) {
        const currentKey = activeTouchKeys.get(touch.identifier)
        if (currentKey === undefined) {
          continue
        }
        activeTouchPositions.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
        const element = document.elementFromPoint(touch.clientX, touch.clientY)
        const nextKey = options.getKeyFromElement(element)
        if (nextKey === undefined || nextKey.id === currentKey.id) {
          continue
        }
        releaseKey(currentKey)
        activateKey(nextKey)
        activeTouchKeys.set(touch.identifier, nextKey)
      }
      return
    }

    if (!options.onBend) {
      return
    }
    for (const touch of event.changedTouches) {
      if (activeTouchKeys.has(touch.identifier)) {
        activeTouchPositions.set(touch.identifier, { x: touch.clientX, y: touch.clientY })
      }
    }
    if (touchStartCentroidY === null) {
      touchStartCentroidY = touchCentroidY()
    }
    const centroidY = touchCentroidY()
    if (touchStartCentroidY === null || centroidY === null) {
      return
    }
    applyBendFromDelta(touchStartCentroidY - centroidY)
  }

  function releaseAll() {
    noteOffs.forEach((noteOff) => noteOff())
    noteOffs.clear()
    keyPressCounts.clear()
    activeTouchKeys.clear()
    activeTouchPositions.clear()
    isMousePressed = false
    activeMouseKey = null
    mouseStartY = null
    touchStartCentroidY = null
    options.onBend?.(0)
  }

  function onMouseDown(event: MouseEvent, key: SlidingKey) {
    if (event.button !== LEFT_MOUSE_BTN) return
    event.preventDefault()
    isMousePressed = true
    mouseStartY = event.clientY
    activateKey(key)
    activeMouseKey = key
  }

  function onMouseUp(event: MouseEvent) {
    if (event.button !== LEFT_MOUSE_BTN) return
    event.preventDefault()
    if (activeMouseKey) {
      releaseKey(activeMouseKey)
      activeMouseKey = null
    }
    isMousePressed = false
    mouseStartY = null
    options.onBend?.(0)
  }

  function onMouseMove(event: MouseEvent) {
    if (!isMousePressed || options.slideEnabled() || mouseStartY === null || !options.onBend) {
      return
    }
    applyBendFromDelta(mouseStartY - event.clientY)
  }

  function onMouseEnter(event: MouseEvent, key: SlidingKey) {
    if (!isMousePressed || !options.slideEnabled()) return
    event.preventDefault()
    if (activeMouseKey && activeMouseKey.id === key.id) return
    if (activeMouseKey) releaseKey(activeMouseKey)
    activateKey(key)
    activeMouseKey = key
  }

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseMove,
    activateKey,
    releaseKey,
    isKeyActive,
    releaseAll
  }
}
