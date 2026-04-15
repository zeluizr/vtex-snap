#!/usr/bin/env node
import { Command } from 'commander'
import { runInit } from './commands/init.js'
import { runStart } from './commands/start.js'

const program = new Command()

program
  .name('vtex-snap')
  .description('Clone a complete VTEX store catalog to another VTEX store')
  .version('2.6.0')

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
