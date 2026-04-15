import pc from 'picocolors'
import { t, type MessageKey } from '../i18n/index.js'
import type { CloneEvent, CloneSummary } from '../workers/types.js'

export function logEvent(event: CloneEvent): void {
  switch (event.type) {
    case 'step:start':
    case 'step:progress':
    case 'step:complete':
      // handled by spinner
      break
    case 'step:error':
      console.log(
        pc.yellow(`  ⚠  ${event.step}: ${event.message}`) +
        (event.detail ? pc.dim(` — ${event.detail.split('\n')[0]}`) : ''),
      )
      break
    case 'complete':
      console.log('')
      console.log(pc.bold(pc.green(t('logger.completed'))))
      console.log('')
      printSummary(event.summary)
      break
    case 'error':
      console.log('')
      console.log(pc.bold(pc.red(t('logger.error.fatal', { msg: event.message }))))
      break
  }
}

function printSummary(summary: CloneSummary): void {
  const labelKeys: Record<string, MessageKey> = {
    category: 'logger.summary.label.category',
    brand: 'logger.summary.label.brand',
    product: 'logger.summary.label.product',
    sku: 'logger.summary.label.sku',
    specGroup: 'logger.summary.label.specGroup',
    specField: 'logger.summary.label.specField',
    collection: 'logger.summary.label.collection',
  }

  const entries = Object.entries(summary)
  if (entries.length === 0) return

  const labels = entries.map(([k]) => (labelKeys[k] ? t(labelKeys[k]) : k))
  const maxLabel = Math.max(...labels.map((l) => l.length))

  entries.forEach(([_, count], i) => {
    const label = labels[i]!.padEnd(maxLabel)
    console.log(`  ${pc.dim(label)}  ${pc.bold(String(count))}`)
  })
  console.log('')
}
