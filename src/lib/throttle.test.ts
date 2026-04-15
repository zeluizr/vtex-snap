import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Throttle } from './throttle.js'

describe('Throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('acquire() resolves immediately with tokens available', async () => {
    const t = new Throttle()
    await expect(t.acquire()).resolves.toBeUndefined()
    t.release()
  })

  it('decrements concurrency on acquire and restores on release', async () => {
    const t = new Throttle()
    await t.acquire()
    await t.acquire()
    t.release()
    t.release()
    // After releasing, a new acquire should resolve immediately
    await expect(t.acquire()).resolves.toBeUndefined()
    t.release()
  })

  it('release() without prior acquire does not throw', () => {
    const t = new Throttle()
    expect(() => t.release()).not.toThrow()
  })

  it('queues next request when MAX_CONCURRENT (3) is busy; unblocks after release()', async () => {
    const t = new Throttle()

    // Acquire 3 slots (MAX_CONCURRENT)
    for (let i = 0; i < 3; i++) {
      await t.acquire()
    }

    // 6th acquire should not resolve immediately
    let resolved = false
    t.acquire().then(() => {
      resolved = true
    })

    // Flush microtasks — still not resolved
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Release one slot
    t.release()

    // Advance timers to trigger retry (100ms delay when tokens available)
    await vi.advanceTimersByTimeAsync(100)

    expect(resolved).toBe(true)
  })

  it('replenishes tokens after time advance', async () => {
    const t = new Throttle()

    // Exhaust all 240 tokens sequentially (acquire + release to avoid concurrent limit)
    for (let i = 0; i < 240; i++) {
      await t.acquire()
      t.release()
    }

    // Tokens now exhausted — next acquire should be delayed
    let resolved = false
    t.acquire().then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)

    // Advance time past the refill delay (60000/240 = 250ms per token)
    await vi.advanceTimersByTimeAsync(260)

    expect(resolved).toBe(true)
  })

  it('cooldown(ms) blocks new acquires until the cooldown elapses', async () => {
    const t = new Throttle()

    t.cooldown(2000)

    let resolved = false
    t.acquire().then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(1000)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1500) // total 2500 + token refill
    expect(resolved).toBe(true)
  })
})
