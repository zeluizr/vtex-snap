import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigPath, saveConfig } from '../config/store.js'
import { resolveLang, setLang, t, type SupportedLang } from '../i18n/index.js'
import { VtexClient } from '../lib/vtex-client.js'

export async function runInit(): Promise<void> {
  console.log('')
  p.intro(pc.bold(t('init.intro')))

  // Language preference
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

  const persistedLang: SupportedLang | undefined =
    langChoice === 'auto' ? undefined : (langChoice as SupportedLang)
  setLang(persistedLang ?? detected)

  const required = (v: string) => (v.trim().length === 0 ? t('init.field.required') : undefined)

  const source = await p.group(
    {
      intro: () => {
        p.log.info(pc.cyan(t('init.source.heading')))
        return Promise.resolve(undefined)
      },
      accountName: () => p.text({ message: t('init.field.accountName.label'), validate: required }),
      appKey: () => p.text({ message: t('init.field.appKey.label'), validate: required }),
      appToken: () => p.password({ message: t('init.field.appToken.label'), validate: required }),
      sellerId: () =>
        p.text({ message: t('init.field.sellerId.label'), placeholder: '1', defaultValue: '1' }),
    },
    {
      onCancel: () => {
        p.cancel(t('init.cancelled'))
        process.exit(0)
      },
    },
  )

  const target = await p.group(
    {
      intro: () => {
        p.log.info(pc.magenta(t('init.target.heading')))
        return Promise.resolve(undefined)
      },
      accountName: () => p.text({ message: t('init.field.accountName.label'), validate: required }),
      appKey: () => p.text({ message: t('init.field.appKey.label'), validate: required }),
      appToken: () => p.password({ message: t('init.field.appToken.label'), validate: required }),
      sellerId: () =>
        p.text({ message: t('init.field.sellerId.label'), placeholder: '1', defaultValue: '1' }),
    },
    {
      onCancel: () => {
        p.cancel(t('init.cancelled'))
        process.exit(0)
      },
    },
  )

  const config = {
    source: {
      accountName: source.accountName as string,
      appKey: source.appKey as string,
      appToken: source.appToken as string,
      sellerId: (source.sellerId as string | undefined) ?? '1',
    },
    target: {
      accountName: target.accountName as string,
      appKey: target.appKey as string,
      appToken: target.appToken as string,
      sellerId: (target.sellerId as string | undefined) ?? '1',
    },
    ...(persistedLang ? { lang: persistedLang } : {}),
  }

  await saveConfig(config)
  p.log.success(t('init.savedAt', { path: pc.dim(getConfigPath()) }))

  const doCheck = await p.confirm({
    message: t('init.checkConnectivity'),
    initialValue: true,
  })

  if (p.isCancel(doCheck) || !doCheck) {
    p.outro(t('init.outro', { cmd: pc.cyan('vtex-snap start') }))
    return
  }

  const s = p.spinner()

  s.start(t('init.checking.source'))
  try {
    const sourceClient = new VtexClient(config.source)
    await sourceClient.getBrands()
    s.stop(pc.green(t('init.ok.source')))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('init.error.source', { msg })))
  }

  s.start(t('init.checking.target'))
  try {
    const targetClient = new VtexClient(config.target)
    await targetClient.getBrands()
    s.stop(pc.green(t('init.ok.target')))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(t('init.error.target', { msg })))
  }

  p.outro(t('init.outro', { cmd: pc.cyan('vtex-snap start') }))
}
