// Token bucket rate limiter for the VTEX Catalog API.
// Defaults are conservative because catalog_system endpoints (sku/stockkeepingunitbyid)
// have a tighter limit than the documented 45k/min global ceiling.
//
// On a 429, call cooldown(ms) so every in-flight and future request waits before resuming.

const MAX_TOKENS = 240
const REFILL_RATE = 240 // per minute  (≈ 4 req/s)
const MAX_CONCURRENT = 3

export class Throttle {
  private tokens: number = MAX_TOKENS
  private lastRefill: number = Date.now()
  private concurrent: number = 0
  private cooldownUntil: number = 0

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 60000
    const tokensToAdd = elapsed * REFILL_RATE
    this.tokens = Math.min(MAX_TOKENS, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  cooldown(ms: number): void {
    const until = Date.now() + ms
    if (until > this.cooldownUntil) this.cooldownUntil = until
    // Burn current bucket so we don't immediately fire again on resume.
    this.tokens = 0
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = (): void => {
        const now = Date.now()
        if (now < this.cooldownUntil) {
          setTimeout(tryAcquire, this.cooldownUntil - now)
          return
        }
        this.refill()
        if (this.tokens >= 1 && this.concurrent < MAX_CONCURRENT) {
          this.tokens -= 1
          this.concurrent += 1
          resolve()
          return
        }
        const delay = this.tokens < 1 ? 60000 / REFILL_RATE : 100
        setTimeout(tryAcquire, delay)
      }
      tryAcquire()
    })
  }

  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1)
  }
}

export const throttle = new Throttle()
