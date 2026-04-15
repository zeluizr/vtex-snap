import * as p from '@clack/prompts'
import readline from 'node:readline'
import pc from 'picocolors'
import { loadConfig } from '../config/store.js'
import { t } from '../i18n/index.js'
import { VtexClient } from '../lib/vtex-client.js'
import { Dashboard } from '../ui/dashboard.js'
import { runClone } from '../workers/orchestrator.js'

const ALL_STEPS = ['products', 'skus', 'spec-values']

const BANNER_LINES = [
  ' ██╗   ██╗████████╗███████╗██╗  ██╗    ███████╗███╗   ██╗ █████╗ ██████╗',
  ' ██║   ██║╚══██╔══╝██╔════╝╚██╗██╔╝    ██╔════╝████╗  ██║██╔══██╗██╔══██╗',
  ' ██║   ██║   ██║   █████╗   ╚███╔╝     ███████╗██╔██╗ ██║███████║██████╔╝',
  ' ╚██╗ ██╔╝   ██║   ██╔══╝   ██╔██╗     ╚════██║██║╚██╗██║██╔══██║██╔═══╝',
  '  ╚████╔╝    ██║   ███████╗██╔╝ ██╗    ███████║██║ ╚████║██║  ██║██║',
  '   ╚═══╝     ╚═╝   ╚══════╝╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝',
]

const GRADIENT: Array<[number, number, number]> = [
  [255, 70, 130],
  [220, 70, 170],
  [180, 80, 210],
  [130, 100, 240],
  [80, 150, 240],
  [40, 200, 230],
]

const rgb = (r: number, g: number, b: number, text: string): string =>
  `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`

const renderBanner = (): string =>
  '\n' +
  BANNER_LINES.map((line, i) => {
    const color = GRADIENT[i] ?? GRADIENT[GRADIENT.length - 1]!
    return rgb(color[0], color[1], color[2], line)
  }).join('\n') +
  '\n'

export async function runStart(): Promise<void> {
  console.log(renderBanner())
  p.intro(pc.bold(t('start.intro')))

  let config = await loadConfig()

  if (!config) {
    p.log.warn(t('start.noConfig'))
    const inline = await p.confirm({
      message: t('start.configureNow'),
      initialValue: true,
    })

    if (p.isCancel(inline) || !inline) {
      p.cancel(t('start.runInitFirst', { cmd: pc.cyan('vtex-snap init') }))
      process.exit(0)
    }

    const { runInit } = await import('./init.js')
    await runInit()
    config = await loadConfig()

    if (!config) {
      p.cancel(t('start.loadFailed'))
      process.exit(1)
    }
  }

  const s = p.spinner()

  s.start(t('start.checking.source'))
  try {
    const sourceClient = new VtexClient(config.source)
    await sourceClient.getBrands()
    s.stop(pc.green(t('start.ok.source', { name: config.source.accountName })))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('start.error.source', { msg })))
    p.cancel(t('start.checkCreds', { cmd: pc.cyan('vtex-snap init') }))
    process.exit(1)
  }

  s.start(t('start.checking.target'))
  try {
    const targetClient = new VtexClient(config.target)
    await targetClient.getBrands()
    s.stop(pc.green(t('start.ok.target', { name: config.target.accountName })))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('start.error.target', { msg })))
    p.cancel(t('start.checkCreds', { cmd: pc.cyan('vtex-snap init') }))
    process.exit(1)
  }

  const confirmed = await p.confirm({
    message: t('start.confirmAll', {
      source: pc.cyan(config.source.accountName),
      target: pc.cyan(config.target.accountName),
    }),
    initialValue: true,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel(t('start.cancelled'))
    process.exit(0)
  }

  console.log('')

  const dashboard = new Dashboard()
  dashboard.start()
  const startTime = Date.now()

  const cancel = (code = 130) => {
    dashboard.stop()
    teardownKeys()
    process.stdout.write(pc.yellow(`\n  ${t('progress.cancelled')}\n`))
    process.exit(code)
  }

  const teardownKeys = setupCancelKeys(cancel)
  process.on('SIGINT', () => cancel(130))
  process.on('SIGTERM', () => cancel(143))

  try {
    await runClone(config.source, config.target, ALL_STEPS, (event) => dashboard.handle(event))
    dashboard.stop()
    teardownKeys()
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    console.log(pc.dim(t('start.totalTime', { time: timeStr })))
    console.log('')
  } catch {
    dashboard.stop()
    teardownKeys()
    process.exit(1)
  }
}

function setupCancelKeys(onCancel: () => void): () => void {
  const stdin = process.stdin
  if (!stdin.isTTY) return () => {}

  readline.emitKeypressEvents(stdin)
  stdin.setRawMode(true)
  stdin.resume()

  const handler = (_str: string, key: { name?: string; ctrl?: boolean }) => {
    if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      onCancel()
    }
  }
  stdin.on('keypress', handler)

  return () => {
    stdin.off('keypress', handler)
    if (stdin.isTTY) stdin.setRawMode(false)
    stdin.pause()
  }
}
