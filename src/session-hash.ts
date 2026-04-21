import { isRandomId } from '@/utils'

const SESSION_HASH_KEY = 'session'

export function getScaleIdFromHash(url: URL) {
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const sessionId = hashParams.get(SESSION_HASH_KEY)
  if (sessionId === null || !isRandomId(sessionId)) {
    return null
  }
  return sessionId
}

export function writeScaleIdToHash(scaleId: string) {
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  if (hashParams.get(SESSION_HASH_KEY) === scaleId) {
    return
  }
  hashParams.set(SESSION_HASH_KEY, scaleId)
  url.hash = hashParams.toString()
  window.history.replaceState(window.history.state, '', url)
}
