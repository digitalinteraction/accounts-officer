#!/usr/bin/env node

//
// The cli entrypoint
//

import yargs = require('yargs')

import { updateDigitalOceanRecords, doData } from './commands/do'
import { updateGoDaddyRecords, godaddyData } from './commands/godaddy'
import { updateAwsRecords, awsData } from './commands/aws'
import { MergeResult } from './services/airtable'

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
// Data
//
const dataTypes: Record<string, Record<string, Function>> = {
  do: doData,
  godaddy: godaddyData,
  aws: awsData,
}

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
    const service = dataTypes[args.service]
    if (!service) throw new Error(`Unknown service '${args.service}'`)

    const allowedResources = Object.keys(service)
      .map((k) => `"${k}"`)
      .join(', ')

    if (!args.resource) {
      console.log(`Available ${args.service} resources: ${allowedResources}`)
      return
    }

    const resource = service[args.resource]
    if (!resource) {
      throw new Error(
        `Unknown resource '${args.service}.${args.resource}', options: ${allowedResources}`
      )
    }

    const result = await resource()
    console.log(JSON.stringify(result, null, 2))
  })
)

// Run the CLI
yargs.parse()
