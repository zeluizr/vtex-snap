import * as p from '@clack/prompts'
import readline from 'node:readline'
import pc from 'picocolors'
import { loadConfig, setLangPref, type Profile } from '../config/store.js'
import { resolveLang, setLang, t, type SupportedLang } from '../i18n/index.js'
import { VtexClient } from '../lib/vtex-client.js'
import { Dashboard } from '../ui/dashboard.js'
import { runClone } from '../workers/orchestrator.js'
import { runConfig } from './config.js'

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

export async function runInit(): Promise<void> {
  console.log(renderBanner())
  p.intro(pc.bold(t('init.run.intro')))

  // 1. Language: prompt only if not yet persisted.
  let config = await loadConfig()
  if (!config?.lang) {
    const detected = resolveLang({ env: process.env.VTEX_SNAP_LANG })
    const langChoice = await p.select({
      message: t('init.lang.prompt'),
      initialValue: 'auto',
      options: [
        { value: 'auto', label: t('init.lang.auto', { detected }) },
        { value: 'pt', label: t('init.lang.pt') },
        { value: 'es', label: t('init.lang.es') },
        { value: 'en', label: t('init.lang.en') },
      ],
    })
    if (p.isCancel(langChoice)) {
      p.cancel(t('init.cancelled'))
      process.exit(0)
    }
    if (langChoice !== 'auto') {
      const chosen = langChoice as SupportedLang
      setLang(chosen)
      await setLangPref(chosen)
    } else {
      setLang(detected)
    }
    config = await loadConfig()
  }

  // 2. Onboarding: ensure at least 2 profiles.
  while ((config?.profiles.length ?? 0) < 2) {
    const count = config?.profiles.length ?? 0
    p.log.warn(t('init.run.needMore', { count }))
    const add = await p.confirm({
      message: t('init.run.addNow'),
      initialValue: true,
    })
    if (p.isCancel(add) || !add) {
      p.cancel(t('init.run.useConfig', { cmd: pc.cyan('vtex-snap config') }))
      process.exit(0)
    }
    await runConfig()
    config = await loadConfig()
  }

  const profiles = config!.profiles
  const profileLabel = (pf: Profile) => `${pf.accountName} ${pc.dim(`(seller ${pf.sellerId})`)}`

  // 3. Source pick.
  const sourceName = await p.select({
    message: t('init.run.pickSource'),
    options: profiles.map((pf) => ({ value: pf.accountName, label: profileLabel(pf) })),
  })
  if (p.isCancel(sourceName)) {
    p.cancel(t('start.cancelled'))
    process.exit(0)
  }

  const source = profiles.find((pf) => pf.accountName === sourceName)!

  // 4. Target pick (excluding source).
  const targetName = await p.select({
    message: t('init.run.pickTarget'),
    options: profiles
      .filter((pf) => pf.accountName !== sourceName)
      .map((pf) => ({ value: pf.accountName, label: profileLabel(pf) })),
  })
  if (p.isCancel(targetName)) {
    p.cancel(t('start.cancelled'))
    process.exit(0)
  }

  const target = profiles.find((pf) => pf.accountName === targetName)!

  // 5. Connectivity preflight.
  const s = p.spinner()
  s.start(t('start.checking.source'))
  try {
    await new VtexClient(source).getSkuIds(1, 1)
    s.stop(pc.green(t('start.ok.source', { name: source.accountName })))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('start.error.source', { msg })))
    process.exit(1)
  }

  s.start(t('start.checking.target'))
  try {
    await new VtexClient(target).getSkuIds(1, 1)
    s.stop(pc.green(t('start.ok.target', { name: target.accountName })))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('start.error.target', { msg })))
    process.exit(1)
  }

  // 6. Confirm and run.
  const confirmed = await p.confirm({
    message: t('start.confirmAll', {
      source: pc.cyan(source.accountName),
      target: pc.cyan(target.accountName),
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
    await runClone(source, target, ALL_STEPS, (event) => dashboard.handle(event))
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
