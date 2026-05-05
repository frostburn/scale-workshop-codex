type KeyFromElement<K> = (element: Element | null) => K | undefined
type SlidingKey = { id: string; index: number }

type UseSlidingTouchesOptions<K extends SlidingKey> = {
  slideEnabled: () => boolean
  getKeyFromElement: KeyFromElement<K>
  noteOn: (key: K) => () => void
}

export function useSlidingTouches<K extends SlidingKey>(options: UseSlidingTouchesOptions<K>) {
  const activeTouchKeys = new Map<number, K>()
  const keyPressCounts = new Map<string, number>()
  const noteOffs = new Map<string, () => void>()
  let isMousePressed = false
  let activeMouseKey: K | null = null

  function activateKey(key: K) {
    const keyId = key.id
    const activeCount = keyPressCounts.get(keyId) ?? 0
    if (activeCount === 0) {
      noteOffs.set(keyId, options.noteOn(key))
    }
    keyPressCounts.set(keyId, activeCount + 1)
  }

  function releaseKey(key: K) {
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

  function isKeyActive(key: K) {
    return (keyPressCounts.get(key.id) ?? 0) > 0
  }

  function onTouchStart(event: TouchEvent, key: K) {
    event.preventDefault()
    for (const touch of event.changedTouches) {
      if (!activeTouchKeys.has(touch.identifier)) {
        activeTouchKeys.set(touch.identifier, key)
        activateKey(key)
      }
    }
  }

  function onTouchEnd(event: TouchEvent) {
    event.preventDefault()
    for (const touch of event.changedTouches) {
      const activeKey = activeTouchKeys.get(touch.identifier)
      if (activeKey !== undefined) {
        releaseKey(activeKey)
        activeTouchKeys.delete(touch.identifier)
      }
    }
  }

  function onTouchMove(event: TouchEvent) {
    if (!options.slideEnabled()) {
      return
    }
    event.preventDefault()
    for (const touch of event.changedTouches) {
      const currentKey = activeTouchKeys.get(touch.identifier)
      if (currentKey === undefined) {
        continue
      }
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const nextKey = options.getKeyFromElement(element)
      if (nextKey === undefined) {
        continue
      }
      if (nextKey.id === currentKey.id) {
        continue
      }
      releaseKey(currentKey)
      activateKey(nextKey)
      activeTouchKeys.set(touch.identifier, nextKey)
    }
  }

  function releaseAll() {
    noteOffs.forEach((noteOff) => noteOff())
    noteOffs.clear()
    keyPressCounts.clear()
    activeTouchKeys.clear()
    isMousePressed = false
    activeMouseKey = null
  }

  function onMouseDown(event: MouseEvent, key: K) {
    event.preventDefault()
    isMousePressed = true
    activateKey(key)
    activeMouseKey = key
  }

  function onMouseUp(event: MouseEvent) {
    event.preventDefault()
    if (activeMouseKey) {
      releaseKey(activeMouseKey)
      activeMouseKey = null
    }
    isMousePressed = false
  }

  function onMouseEnter(event: MouseEvent, key: K) {
    if (!isMousePressed || !options.slideEnabled()) {
      return
    }
    event.preventDefault()
    if (activeMouseKey && activeMouseKey.id === key.id) {
      return
    }
    if (activeMouseKey) {
      releaseKey(activeMouseKey)
    }
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
    activateKey,
    releaseKey,
    isKeyActive,
    releaseAll
  }
}
