import * as p from '@clack/prompts'
import pc from 'picocolors'
import { addProfile, getConfigPath, type Profile } from '../config/store.js'
import { t } from '../i18n/index.js'
import { VtexClient } from '../lib/vtex-client.js'

export async function runConfig(): Promise<Profile | null> {
  console.log('')
  p.intro(pc.bold(t('config.intro')))

  const required = (v: string) => (v.trim().length === 0 ? t('init.field.required') : undefined)

  const data = await p.group(
    {
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

  const profile: Profile = {
    accountName: (data.accountName as string).trim(),
    appKey: (data.appKey as string).trim(),
    appToken: (data.appToken as string).trim(),
    sellerId: ((data.sellerId as string | undefined) ?? '1').trim() || '1',
  }

  const s = p.spinner()
  s.start(t('config.testing'))
  let validationError: string | null = null
  try {
    const client = new VtexClient(profile)
    await client.getBrands()
    s.stop(pc.green(t('config.ok')))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] ?? '' : String(error)
    s.stop(pc.red(t('init.error.source', { msg })))
    validationError = msg
  }

  if (validationError) {
    const proceed = await p.confirm({
      message: t('config.testFailed', { msg: validationError }),
      initialValue: false,
    })
    if (p.isCancel(proceed) || !proceed) {
      p.cancel(t('init.cancelled'))
      return null
    }
  }

  await addProfile(profile)
  p.log.success(t('config.saved', { path: pc.dim(getConfigPath()) }))
  p.outro(
    t('config.outro', {
      name: pc.cyan(profile.accountName),
      cmd: pc.cyan('vtex-snap init'),
    }),
  )

  return profile
}
