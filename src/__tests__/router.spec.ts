import { beforeEach, describe, expect, it } from 'vitest'
import router from '@/router'

describe('router state carry-over', () => {
  beforeEach(async () => {
    await router.push('/')
  })

  it('persists hash while switching tabs', async () => {
    await router.push('/?version=3.3.0#session=abcdefgh9')
    await router.push('/analysis')

    expect(router.currentRoute.value.hash).toBe('#session=abcdefgh9')
  })

  it('keeps explicit target hash when provided', async () => {
    await router.push('/?version=3.3.0#session=abcdefgh9')
    await router.push('/analysis#session=zzzzzzzzz')

    expect(router.currentRoute.value.hash).toBe('#session=zzzzzzzzz')
  })
})
