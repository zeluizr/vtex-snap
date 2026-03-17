import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigPath, saveConfig } from '../config/store.js'
import { VtexClient } from '../lib/vtex-client.js'

export async function runInit(): Promise<void> {
  console.log('')
  p.intro(pc.bold('VTEX Catalog Cloner — Configuração'))

  const source = await p.group(
    {
      intro: () => {
        p.log.info(pc.cyan('Loja Origem'))
        return Promise.resolve(undefined)
      },
      accountName: () =>
        p.text({
          message: 'Account Name (ex: minhalojatest)',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      appKey: () =>
        p.text({
          message: 'App Key',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      appToken: () =>
        p.password({
          message: 'App Token',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      sellerId: () =>
        p.text({
          message: 'Seller ID',
          placeholder: '1',
          defaultValue: '1',
        }),
    },
    {
      onCancel: () => {
        p.cancel('Configuração cancelada.')
        process.exit(0)
      },
    },
  )

  const target = await p.group(
    {
      intro: () => {
        p.log.info(pc.magenta('Loja Destino'))
        return Promise.resolve(undefined)
      },
      accountName: () =>
        p.text({
          message: 'Account Name (ex: minhalojatest)',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      appKey: () =>
        p.text({
          message: 'App Key',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      appToken: () =>
        p.password({
          message: 'App Token',
          validate: (v) => (v.trim().length === 0 ? 'Obrigatório' : undefined),
        }),
      sellerId: () =>
        p.text({
          message: 'Seller ID',
          placeholder: '1',
          defaultValue: '1',
        }),
    },
    {
      onCancel: () => {
        p.cancel('Configuração cancelada.')
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
  }

  await saveConfig(config)
  p.log.success(`Configuração salva em ${pc.dim(getConfigPath())}`)

  const doCheck = await p.confirm({
    message: 'Verificar conectividade agora?',
    initialValue: true,
  })

  if (p.isCancel(doCheck) || !doCheck) {
    p.outro('Pronto! Use ' + pc.cyan('vtex-snap start') + ' para iniciar a clonagem.')
    return
  }

  const s = p.spinner()

  s.start('Verificando loja origem...')
  try {
    const sourceClient = new VtexClient(config.source)
    await sourceClient.getCategoryTree(1)
    s.stop(pc.green('✓ Loja origem: OK'))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Loja origem: ${msg}`))
  }

  s.start('Verificando loja destino...')
  try {
    const targetClient = new VtexClient(config.target)
    await targetClient.getCategoryTree(1)
    s.stop(pc.green('✓ Loja destino: OK'))
  } catch (error) {
    const msg = error instanceof Error ? error.message.split('\n')[0] : String(error)
    s.stop(pc.red(`✗ Loja destino: ${msg}`))
  }

  p.outro('Pronto! Use ' + pc.cyan('vtex-snap start') + ' para iniciar a clonagem.')
}
