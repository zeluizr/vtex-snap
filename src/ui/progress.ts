import type { Ora } from 'ora'
import pc from 'picocolors'
import type { CloneEvent } from '../workers/types.js'

const STEP_LABELS: Record<string, string> = {
  categories: 'Categorias',
  brands: 'Marcas',
  'trade-policies': 'Trade Policies',
  specifications: 'Especificações',
  products: 'Produtos',
  skus: 'SKUs',
  images: 'Imagens',
  'spec-values': 'Valores de Spec',
  prices: 'Preços',
  stock: 'Estoque',
  collections: 'Coleções',
}

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

export function updateSpinner(spinner: Ora, event: CloneEvent): void {
  switch (event.type) {
    case 'step:start': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = STEP_LABELS[event.step] ?? event.step
      spinner.start(
        pc.cyan(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` — ${event.total} itens`),
      )
      break
    }
    case 'step:progress': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = STEP_LABELS[event.step] ?? event.step
      const pct = Math.round((event.current / event.total) * 100)
      spinner.text =
        pc.cyan(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` ${event.current}/${event.total} (${pct}%) — ${event.detail}`)
      break
    }
    case 'step:complete': {
      const idx = STEP_ORDER.indexOf(event.step) + 1
      const label = STEP_LABELS[event.step] ?? event.step
      const errPart = event.errors > 0 ? pc.yellow(`, ${event.errors} erros`) : ''
      spinner.succeed(
        pc.green(`[${idx}/${STEP_ORDER.length}] ${label}`) +
        pc.dim(` — ${event.created} criados`) +
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
