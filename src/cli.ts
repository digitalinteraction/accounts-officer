#!/usr/bin/env node

//
// The cli entry point
//

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { updateDigitalOceanRecords } from './commands/do.js'
import { updateGoDaddyRecords } from './commands/godaddy.js'
import { updateAwsRecords } from './commands/aws.js'
import { MergeResult } from './services/airtable.js'
import { dataTypes, runDataCommand } from './commands/data.js'
import { updateSendgridRecords } from './commands/sendgrid.js'

/** wrap a top-level function to handle it's errors by outputting them and exiting the process */
function handleErrors<T extends any[], U>(
  block: (...args: T) => U | Promise<U>
) {
  return async (...args: T) => {
    try {
      return await block(...args)
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)

      process.exit(1)
    }
  }
}

export interface RunOptions {
  dryRun: boolean
}

async function runUpdate<T extends any[], U>(
  message: string,
  run: (options: RunOptions) => Promise<MergeResult>,
  options: RunOptions
) {
  console.log(message)
  const result = await run(options)
  console.log('  unlinked: %o', result.unlinked)
  console.log('  update: %o', result.updated)
  console.log('  created: %o', result.created)
  console.log()
}

const cli = yargs(hideBin(process.argv))
  .help()
  .alias('h', 'help')
  .demandCommand()
  .recommendCommands()
  .option('dryRun', { type: 'boolean', default: false })

//
// All
//
cli.command(
  'all',
  'Run all services in sequence',
  (yargs) => yargs,
  handleErrors(async (args) => {
    await runUpdate('Updating AWS', updateAwsRecords, args)
    await runUpdate('Updating DO', updateDigitalOceanRecords, args)
    await runUpdate('Updating GoDaddy', updateGoDaddyRecords, args)
    await runUpdate('Updating SendGrid', updateSendgridRecords, args)
  })
)

//
// AWS
//
cli.command(
  'aws',
  'Run through AWS, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors((args) => runUpdate('Updating AWS', updateAwsRecords, args))
)

//
// DigitalOcean
//
cli.command(
  ['digitalocean', 'do'],
  'Run through DigitalOcean, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors((args) =>
    runUpdate('Updating DO', updateDigitalOceanRecords, args)
  )
)

//
// GoDaddy
//
cli.command(
  'godaddy',
  'Run through GoDaddy, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors((args) =>
    runUpdate('Updating GoDaddy', updateGoDaddyRecords, args)
  )
)

//
// SendGrid
//
cli.command(
  'sendgrid',
  'Run through SendGrid, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors((args) =>
    runUpdate('Updating SendGrid', updateSendgridRecords, args)
  )
)

cli.command(
  'data <service> [resource]',
  'Fetch data from a service',
  (yargs) =>
    yargs
      .positional('service', {
        type: 'string',
        choices: Object.keys(dataTypes),
        demandOption: true,
      })
      .positional('resource', {
        type: 'string',
        demandOption: true,
      }),
  handleErrors(async (args) => {
    await runDataCommand(args.service, args.resource)
  })
)

// Run the CLI
cli.parse()
