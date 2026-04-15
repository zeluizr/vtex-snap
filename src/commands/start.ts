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
  { value: 'products', label: '1. Produtos' },
  { value: 'skus', label: '2. SKUs' },
  { value: 'spec-values', label: '3. Valores de Especificações' },
]

export async function runStart(): Promise<void> {
  console.log('')
  p.intro(pc.bold('VTEX Catalog Cloner — Iniciar Clonagem'))

  let config = await loadConfig()

  if (!config) {
    p.log.warn('Nenhuma configuração encontrada.')
    const inline = await p.confirm({
      message: 'Configurar agora?',
      initialValue: true,
    })

    if (p.isCancel(inline) || !inline) {
      p.cancel('Execute ' + pc.cyan('vtex-snap init') + ' primeiro.')
      process.exit(0)
    }

    const { runInit } = await import('./init.js')
    await runInit()
    config = await loadConfig()

    if (!config) {
      p.cancel('Falha ao carregar configuração.')
      process.exit(1)
    }
  }

  const s = p.spinner()

  s.start('Verificando credenciais da loja origem...')
  try {
    const sourceClient = new VtexClient(config.source)
    await sourceClient.getBrands()
    s.stop(pc.green(`✓ Origem: ${config.source.accountName}`))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Erro na loja origem: ${msg}`))
    p.cancel('Verifique as credenciais com ' + pc.cyan('vtex-snap init'))
    process.exit(1)
  }

  s.start('Verificando credenciais da loja destino...')
  try {
    const targetClient = new VtexClient(config.target)
    await targetClient.getBrands()
    s.stop(pc.green(`✓ Destino: ${config.target.accountName}`))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Erro na loja destino: ${msg}`))
    p.cancel('Verifique as credenciais com ' + pc.cyan('vtex-snap init'))
    process.exit(1)
  }

  // Step selection
  const cloneAll = await p.select({
    message: 'O que deseja clonar?',
    options: [
      { value: 'all', label: `Tudo (${ALL_STEPS.length} etapas)` },
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

  // Range de IDs de produto (sempre necessário porque o fluxo todo gira em torno deles)
  const fromInput = await p.text({
    message: 'ID inicial de produto a varrer:',
    initialValue: '1',
    validate: (v) => (/^\d+$/.test(v) && parseInt(v, 10) > 0 ? undefined : 'Informe um inteiro positivo'),
  })
  if (p.isCancel(fromInput)) {
    p.cancel('Operação cancelada.')
    process.exit(0)
  }

  const toInput = await p.text({
    message: 'ID final de produto a varrer:',
    initialValue: '1000',
    validate: (v) => (/^\d+$/.test(v) && parseInt(v, 10) > 0 ? undefined : 'Informe um inteiro positivo'),
  })
  if (p.isCancel(toInput)) {
    p.cancel('Operação cancelada.')
    process.exit(0)
  }

  const productIdFrom = parseInt(fromInput as string, 10)
  const productIdTo = parseInt(toInput as string, 10)

  if (productIdTo < productIdFrom) {
    p.cancel('ID final deve ser ≥ ID inicial.')
    process.exit(1)
  }

  const stepCount = selectedSteps.length
  const confirmed = await p.confirm({
    message: `Clonar de ${pc.cyan(config.source.accountName)} → ${pc.cyan(config.target.accountName)} (${stepCount} etapas, IDs ${productIdFrom}..${productIdTo}). Continuar?`,
    initialValue: true,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Operação cancelada.')
    process.exit(0)
  }

  console.log('')

  const spinner = ora({ text: 'Iniciando...', color: 'cyan' }).start()
  const startTime = Date.now()

  const emit = (event: CloneEvent) => {
    updateSpinner(spinner, event)
    logEvent(event)
  }

  try {
    await runClone(config.source, config.target, selectedSteps, emit, {
      productIdFrom,
      productIdTo,
    })
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    console.log(pc.dim(`  Tempo total: ${timeStr}`))
    console.log('')
  } catch {
    process.exit(1)
  }
}
