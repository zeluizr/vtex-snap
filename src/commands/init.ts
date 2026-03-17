import * as p from '@clack/prompts'
import ora from 'ora'
import pc from 'picocolors'
import { loadConfig } from '../config/store.js'
import { VtexClient } from '../lib/vtex-client.js'
import { logEvent } from '../ui/logger.js'
import { updateSpinner } from '../ui/progress.js'
import { runClone } from '../workers/orchestrator.js'
import type { CloneEvent } from '../workers/types.js'

const ALL_STEPS = [
  { value: 'categories', label: '1. Categorias' },
  { value: 'brands', label: '2. Marcas' },
  { value: 'trade-policies', label: '3. Trade Policies' },
  { value: 'specifications', label: '4. Especificações' },
  { value: 'products', label: '5. Produtos' },
  { value: 'skus', label: '6. SKUs' },
  { value: 'images', label: '7. Imagens' },
  { value: 'spec-values', label: '8. Valores de Spec' },
  { value: 'prices', label: '9. Preços' },
  { value: 'stock', label: '10. Estoque' },
  { value: 'collections', label: '11. Coleções' },
]

export async function runInit(): Promise<void> {
  console.log('')
  p.intro(pc.bold('VTEX Catalog Cloner — Iniciar Clonagem'))

  // Load config
  let config = await loadConfig()

  if (!config) {
    p.log.warn('Nenhuma configuração encontrada.')
    const inline = await p.confirm({
      message: 'Configurar agora?',
      initialValue: true,
    })

    if (p.isCancel(inline) || !inline) {
      p.cancel('Execute ' + pc.cyan('catalog-cloner config') + ' primeiro.')
      process.exit(0)
    }

    // Run inline config import
    const { runConfig } = await import('./config.js')
    await runConfig()
    config = await loadConfig()

    if (!config) {
      p.cancel('Falha ao carregar configuração.')
      process.exit(1)
    }
  }

  // Preflight connectivity check
  const s = p.spinner()

  s.start('Verificando credenciais da loja origem...')
  try {
    const sourceClient = new VtexClient(config.source)
    await sourceClient.getCategoryTree(1)
    s.stop(pc.green(`✓ Origem: ${config.source.accountName}`))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Erro na loja origem: ${msg}`))
    p.cancel('Verifique as credenciais com ' + pc.cyan('catalog-cloner config'))
    process.exit(1)
  }

  s.start('Verificando credenciais da loja destino...')
  try {
    const targetClient = new VtexClient(config.target)
    await targetClient.getCategoryTree(1)
    s.stop(pc.green(`✓ Destino: ${config.target.accountName}`))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Erro na loja destino: ${msg}`))
    p.cancel('Verifique as credenciais com ' + pc.cyan('catalog-cloner config'))
    process.exit(1)
  }

  // Step selection
  const cloneAll = await p.select({
    message: 'O que deseja clonar?',
    options: [
      { value: 'all', label: 'Tudo (11 etapas)' },
      { value: 'select', label: 'Selecionar etapas...' },
    ],
  })

  if (p.isCancel(cloneAll)) {
    p.cancel('Operação cancelada.')
    process.exit(0)
  }

  let selectedSteps: string[]

  if (cloneAll === 'all') {
    selectedSteps = ALL_STEPS.map((s) => s.value)
  } else {
    const chosen = await p.multiselect({
      message: 'Selecione as etapas (espaço para marcar)',
      options: ALL_STEPS,
      initialValues: ALL_STEPS.map((s) => s.value),
      required: true,
    })

    if (p.isCancel(chosen)) {
      p.cancel('Operação cancelada.')
      process.exit(0)
    }

    selectedSteps = chosen as string[]
  }

  const stepCount = selectedSteps.length
  const confirmed = await p.confirm({
    message: `Clonar de ${pc.cyan(config.source.accountName)} → ${pc.cyan(config.target.accountName)} (${stepCount} etapas). Continuar?`,
    initialValue: true,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Operação cancelada.')
    process.exit(0)
  }

  console.log('')

  // Run clone
  const spinner = ora({ text: 'Iniciando...', color: 'cyan' }).start()
  const startTime = Date.now()

  const emit = (event: CloneEvent) => {
    updateSpinner(spinner, event)
    logEvent(event)
  }

  try {
    await runClone(config.source, config.target, selectedSteps, emit)
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    console.log(pc.dim(`  Tempo total: ${timeStr}`))
    console.log('')
  } catch {
    // error event already emitted by orchestrator
    process.exit(1)
  }
}
