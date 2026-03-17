#!/usr/bin/env node
import { Command } from 'commander'
import { runConfig } from './commands/config.js'
import { runInit } from './commands/init.js'

const program = new Command()

program
  .name('catalog-cloner')
  .description('Clone a complete VTEX store catalog to another VTEX store')
  .version('1.0.0')

program
  .command('config')
  .description('Configure source and target store credentials')
  .action(async () => {
    await runConfig()
  })

program
  .command('init')
  .description('Start the catalog cloning process')
  .action(async () => {
    await runInit()
  })

program.parse()
