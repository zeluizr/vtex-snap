import type { Ora } from 'ora'
import pc from 'picocolors'
import { t, type MessageKey } from '../i18n/index.js'
import type { CloneEvent } from '../workers/types.js'

const STEP_ORDER = [
  'categories',
  'brands',
  'trade-policies',
  'specifications',
  'products',
  'skus',
  'images',
  'spec-values',
  'prices',
  'stock',
  'collections',
]

function stepLabel(step: string): string {
  const key = `progress.step.${step}` as MessageKey
  return t(key)
}

export function updateSpinner(spinner: Ora, event: CloneEvent): void {
  switch (event.type) {
    case 'step:start': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = stepLabel(event.step)
      spinner.start(
        pc.cyan(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` — ${event.total} ${t('progress.items')}`),
      )
      break
    }
    case 'step:progress': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = stepLabel(event.step)
      const pct = Math.round((event.current / event.total) * 100)
      spinner.text =
        pc.cyan(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` ${event.current}/${event.total} (${pct}%) — ${event.detail}`)
      break
    }
    case 'step:complete': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = stepLabel(event.step)
      const errPart =
        event.errors > 0 ? pc.yellow(`, ${t('progress.errors', { n: event.errors })}`) : ''
      spinner.succeed(
        pc.green(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` — ${t('progress.created', { n: event.created })}`) +
        errPart,
      )
      break
    }
    case 'step:error':
      // Keep spinner running — individual item errors don't stop the step
      break
    case 'complete':
    case 'error':
      if (spinner.isSpinning) spinner.stop()
      break
  }
}
