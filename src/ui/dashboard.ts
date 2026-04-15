import pc from 'picocolors'
import { t, type MessageKey } from '../i18n/index.js'
import type { CloneEvent } from '../workers/types.js'

const STEP_KEYS = ['discovery', 'products', 'skus', 'spec-values'] as const
type StepKey = (typeof STEP_KEYS)[number]

type Status = 'pending' | 'active' | 'done' | 'error'

interface StepState {
  status: Status
  current: number
  total: number
  startedAt?: number
  endedAt?: number
  errors: number
  created: number
}

const BAR_WIDTH = 24
const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const TICK_MS = 120

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m < 60) return r === 0 ? `${m}m` : `${m}m${r}s`
  const h = Math.floor(m / 60)
  const mr = m % 60
  return `${h}h${mr}m`
}

export class Dashboard {
  private steps = new Map<StepKey, StepState>()
  private rendered = false
  private spinIdx = 0
  private ticker?: ReturnType<typeof setInterval>
  private lastError?: string

  constructor() {
    for (const k of STEP_KEYS) {
      this.steps.set(k, { status: 'pending', current: 0, total: 0, errors: 0, created: 0 })
    }
  }

  start(): void {
    this.ticker = setInterval(() => {
      this.spinIdx++
      this.render()
    }, TICK_MS)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = undefined
    this.render()
  }

  handle(event: CloneEvent): void {
    switch (event.type) {
      case 'step:start': {
        const s = this.steps.get(event.step as StepKey)
        if (s) {
          s.status = 'active'
          s.total = event.total
          s.current = 0
          s.startedAt = Date.now()
        }
        break
      }
      case 'step:progress': {
        const s = this.steps.get(event.step as StepKey)
        if (s) {
          s.current = event.current
          s.total = event.total
        }
        break
      }
      case 'step:complete': {
        const s = this.steps.get(event.step as StepKey)
        if (s) {
          s.status = 'done'
          s.endedAt = Date.now()
          s.created = event.created
          s.errors = event.errors
          if (s.total === 0) s.total = event.created
          s.current = s.total
        }
        break
      }
      case 'step:error': {
        this.lastError = `${event.step}: ${event.message}`
        break
      }
      case 'error': {
        for (const s of this.steps.values()) {
          if (s.status === 'active') s.status = 'error'
        }
        this.lastError = event.message
        break
      }
      case 'complete':
        for (const s of this.steps.values()) {
          if (s.status === 'active') s.status = 'done'
        }
        break
    }
    this.render()
  }

  private render(): void {
    const lines: string[] = STEP_KEYS.map((k) => this.renderRow(k))
    if (this.lastError) {
      lines.push(pc.dim('  ' + pc.yellow('!') + ' ' + truncate(this.lastError, 80)))
    } else {
      lines.push('')
    }
    lines.push(pc.dim('  ' + t('progress.cancelHint')))

    if (this.rendered) {
      // Move cursor up N lines and clear from there.
      process.stdout.write(`\x1b[${lines.length}F\x1b[0J`)
    }
    process.stdout.write(lines.join('\n') + '\n')
    this.rendered = true
  }

  private renderRow(key: StepKey): string {
    const s = this.steps.get(key)!
    const icon = this.statusIcon(s.status)
    const labelKey = `progress.step.${key}` as MessageKey
    const name = t(labelKey).padEnd(14)
    const bar = this.bar(s)
    const counts = this.counts(s)
    const eta = this.eta(s)
    return `  ${icon}  ${pc.bold(name)}  ${bar}  ${counts.padEnd(16)} ${eta}`
  }

  private statusIcon(status: Status): string {
    if (status === 'done') return pc.green('✓')
    if (status === 'error') return pc.red('✗')
    if (status === 'active') return pc.cyan(SPIN_FRAMES[this.spinIdx % SPIN_FRAMES.length]!)
    return pc.dim('·')
  }

  private bar(s: StepState): string {
    let pct = 0
    if (s.status === 'done') pct = 1
    else if (s.total > 0) pct = Math.min(1, s.current / s.total)
    const filled = Math.round(pct * BAR_WIDTH)
    const empty = BAR_WIDTH - filled
    const fillColor = s.status === 'error' ? pc.red : pc.cyan
    return fillColor('━'.repeat(filled)) + pc.dim('─'.repeat(empty))
  }

  private counts(s: StepState): string {
    if (s.status === 'pending') return pc.dim(t('progress.pending'))
    if (s.status === 'done') {
      const errs = s.errors > 0 ? pc.yellow(` (${s.errors}!)`) : ''
      return pc.green(t('progress.done')) + pc.dim(` ${s.created}`) + errs
    }
    if (s.status === 'error') return pc.red(`${s.current}/${s.total || '?'}`)
    return pc.dim(`${s.current}/${s.total || '?'}`)
  }

  private eta(s: StepState): string {
    if (s.status !== 'active' || !s.startedAt || s.current <= 0 || s.total <= 0) return ''
    const elapsedSec = (Date.now() - s.startedAt) / 1000
    const rate = s.current / elapsedSec
    if (rate <= 0) return ''
    const remaining = (s.total - s.current) / rate
    return pc.dim(t('progress.eta', { time: formatDuration(remaining) }))
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
