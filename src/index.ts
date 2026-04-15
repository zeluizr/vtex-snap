#!/usr/bin/env node
import { Command } from 'commander'
import { runInit } from './commands/init.js'
import { runStart } from './commands/start.js'
import { loadConfig } from './config/store.js'
import { resolveLang, setLang } from './i18n/index.js'

async function bootstrapLang(flag?: string): Promise<void> {
  const config = await loadConfig().catch(() => null)
  setLang(
    resolveLang({
      flag,
      env: process.env.VTEX_SNAP_LANG,
      config: config?.lang,
    }),
  )
}

const program = new Command()

program
  .name('vtex-snap')
  .description('Clone a complete VTEX store catalog to another VTEX store')
  .version('2.8.0')
  .option('--lang <lang>', 'CLI language: pt | es | en')
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.optsWithGlobals<{ lang?: string }>()
    await bootstrapLang(opts.lang)
  })

program
  .command('init')
  .description('Configure source and target store credentials')
  .action(async () => {
    await runInit()
  })

program
  .command('start')
  .description('Start the catalog cloning process')
  .action(async () => {
    await runStart()
  })

program.parse()
