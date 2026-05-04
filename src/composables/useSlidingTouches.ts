type KeyId = string | number

type KeyFromElement<T extends KeyId, K> = (element: Element | null) => K | undefined
type KeyIdOf<K, T extends KeyId> = (key: K) => T

type UseSlidingTouchesOptions<T extends KeyId, K> = {
  slideEnabled: () => boolean
  getKeyFromElement: KeyFromElement<T, K>
  getKeyId: KeyIdOf<K, T>
  noteOn: (key: K) => () => void
}

export function useSlidingTouches<T extends KeyId, K>(options: UseSlidingTouchesOptions<T, K>) {
  const activeTouchKeys = new Map<number, K>()
  const keyPressCounts = new Map<T, number>()
  const noteOffs = new Map<T, () => void>()

  function activateKey(key: K) {
    const keyId = options.getKeyId(key)
    const activeCount = keyPressCounts.get(keyId) ?? 0
    if (activeCount === 0) {
      noteOffs.set(keyId, options.noteOn(key))
    }
    keyPressCounts.set(keyId, activeCount + 1)
  }

  function releaseKey(key: K) {
    const keyId = options.getKeyId(key)
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
    return (keyPressCounts.get(options.getKeyId(key)) ?? 0) > 0
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
      if (options.getKeyId(nextKey) === options.getKeyId(currentKey)) {
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
  }

  return { onTouchStart, onTouchEnd, onTouchMove, activateKey, releaseKey, isKeyActive, releaseAll }
}
