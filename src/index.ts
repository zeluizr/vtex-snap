#!/usr/bin/env node
import { Command } from 'commander'
import { runConfig } from './commands/config.js'
import { runInit } from './commands/init.js'
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
  .version('2.9.1')
  .option('--lang <lang>', 'CLI language: pt | es | en')
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.optsWithGlobals<{ lang?: string }>()
    await bootstrapLang(opts.lang)
  })

program
  .command('init')
  .description('Start a catalog cloning run (onboards if no profiles yet)')
  .action(async () => {
    await runInit()
  })

program
  .command('config')
  .description('Add a new VTEX store profile')
  .action(async () => {
    await runConfig()
  })

program.parse()
