import pc from 'picocolors'
import type { CloneEvent, CloneSummary } from '../workers/types.js'

export function logEvent(event: CloneEvent): void {
  switch (event.type) {
    case 'step:start':
      // handled by spinner
      break
    case 'step:progress':
      // handled by spinner text update — not printed to avoid flood
      break
    case 'step:complete':
      // handled by spinner success
      break
    case 'step:error':
      console.log(
        pc.yellow(`  ⚠  ${event.step}: ${event.message}`) +
        (event.detail ? pc.dim(` — ${event.detail.split('\n')[0]}`) : ''),
      )
      break
    case 'complete':
      console.log('')
      console.log(pc.bold(pc.green('  ✓ Clonagem concluída!')))
      console.log('')
      printSummary(event.summary)
      break
    case 'error':
      console.log('')
      console.log(pc.bold(pc.red(`  ✗ Erro fatal: ${event.message}`)))
      break
  }
}

function printSummary(summary: CloneSummary): void {
  const labels: Record<string, string> = {
    category: 'Categorias',
    brand: 'Marcas',
    product: 'Produtos',
    sku: 'SKUs',
    specGroup: 'Grupos de spec',
    specField: 'Campos de spec',
    collection: 'Coleções',
  }

  const entries = Object.entries(summary)
  if (entries.length === 0) return

  const maxLabel = Math.max(...entries.map(([k]) => (labels[k] ?? k).length))

  for (const [key, count] of entries) {
    const label = (labels[key] ?? key).padEnd(maxLabel)
    console.log(`  ${pc.dim(label)}  ${pc.bold(String(count))}`)
  }
  console.log('')
}
