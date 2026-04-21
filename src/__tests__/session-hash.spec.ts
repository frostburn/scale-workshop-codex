import { describe, expect, it, vi } from 'vitest'
import { getScaleIdFromHash, writeScaleIdToHash } from '@/session-hash'

describe('session hash', () => {
  it('extracts valid scale id from hash', () => {
    const url = new URL('https://example.com/?version=3#session=012345678')
    expect(getScaleIdFromHash(url)).toBe('012345678')
  })

  it('ignores invalid scale ids', () => {
    const url = new URL('https://example.com/#session=bad')
    expect(getScaleIdFromHash(url)).toBeNull()
  })

  it('writes id to current URL hash', () => {
    vi.spyOn(window.history, 'replaceState')
    window.history.replaceState({}, '', '/?version=3')

    writeScaleIdToHash('abcdefgh9')

    expect(window.location.hash).toContain('session=abcdefgh9')
  })
})
