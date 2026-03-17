// Token bucket rate limiter: 400 tokens, refill 400/min, max 5 concurrent requests

const MAX_TOKENS = 400
const REFILL_RATE = 400 // per minute
const MAX_CONCURRENT = 5

class Throttle {
  private tokens: number = MAX_TOKENS
  private lastRefill: number = Date.now()
  private concurrent: number = 0
  private queue: Array<() => void> = []

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 60000 // minutes
    const tokensToAdd = elapsed * REFILL_RATE
    this.tokens = Math.min(MAX_TOKENS, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.refill()
        if (this.tokens >= 1 && this.concurrent < MAX_CONCURRENT) {
          this.tokens -= 1
          this.concurrent += 1
          resolve()
        } else {
          // Wait and retry
          const delay = this.tokens < 1 ? (60000 / REFILL_RATE) : 100
          setTimeout(() => {
            const index = this.queue.indexOf(tryAcquire)
            if (index !== -1) this.queue.splice(index, 1)
            tryAcquire()
          }, delay)
          if (!this.queue.includes(tryAcquire)) {
            this.queue.push(tryAcquire)
          }
        }
      }
      tryAcquire()
    })
  }

  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1)
  }
}

export const throttle = new Throttle()
