#!/usr/bin/env node

//
// The cli entrypoint
//

import yargs = require('yargs')

import { updateDigitalOceanRecords } from './commands/do'
import { updateGoDaddyRecords } from './commands/godaddy'
import { updateAwsRecords } from './commands/aws'
import { MergeResult } from './services/airtable'
import { dataTypes, runDataCommand } from './commands/data'
import { updateSendgridRecords } from './commands/sendgrid'

/** wrap a top-level function to handle it's errors by outputting them and exiting the process */
function handleErrors<T extends any[], U>(
  block: (...args: T) => U | Promise<U>
) {
  return async (...args: T) => {
    try {
      return await block(...args)
    } catch (error) {
      console.error(error.message)

      if (process.env.NODE_ENV === 'development') {
        console.error()
        console.error(error.stack)
      }

      process.exit(1)
    }
  }
}

async function runUpdate<T extends any[], U>(
  message: string,
  run: () => Promise<MergeResult>
) {
  console.log(message)
  const result = await run()
  console.log('  unlinked: %o', result.unlinked)
  console.log('  update: %o', result.updated)
  console.log('  created: %o', result.created)
  console.log()
}

yargs.help().alias('h', 'help').demandCommand().recommendCommands()

//
// All
//
yargs.command(
  'all',
  'Run all services in sequence',
  (yargs) => yargs,
  handleErrors(async (args) => {
    await runUpdate('Updating AWS', updateAwsRecords)
    await runUpdate('Updating DO', updateDigitalOceanRecords)
    await runUpdate('Updating GoDaddy', updateGoDaddyRecords)
    await runUpdate('Updating SendGrid', updateSendgridRecords)
  })
)

//
// AWS
//
yargs.command(
  'aws',
  'Run through AWS, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors(() => runUpdate('Updating AWS', updateAwsRecords))
)

//
// DigitalOcean
//
yargs.command(
  ['digitalocean', 'do'],
  'Run through DigitalOcean, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors(() => runUpdate('Updating DO', updateDigitalOceanRecords))
)

//
// GoDaddy
//
yargs.command(
  'godaddy',
  'Run through GoDaddy, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors(() => runUpdate('Updating GoDaddy', updateGoDaddyRecords))
)

//
// SendGrid
//
yargs.command(
  'sendgrid',
  'Run through SendGrid, fetch resources and update Airtable',
  (yargs) => yargs,
  handleErrors(() => runUpdate('Updating SendGrid', updateSendgridRecords))
)

yargs.command(
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
yargs.parse()
