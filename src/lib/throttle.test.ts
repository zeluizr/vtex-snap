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

  it('queues 6th request when MAX_CONCURRENT (5) is busy; unblocks after release()', async () => {
    const t = new Throttle()

    // Acquire 5 slots (MAX_CONCURRENT)
    for (let i = 0; i < 5; i++) {
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

    // Exhaust all 400 tokens sequentially (acquire + release to avoid concurrent limit)
    for (let i = 0; i < 400; i++) {
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

    // Advance time past the refill delay (60000/400 = 150ms per token)
    await vi.advanceTimersByTimeAsync(160)

    expect(resolved).toBe(true)
  })
})
