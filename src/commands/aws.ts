import createDebug from 'debug'

import {
  airtable,
  combineMergeResults,
  MergableRecord,
  mergeAirtableRecords,
} from '../services/airtable.js'
import { appConfig } from '../lib/config.js'
import * as aws from '../services/aws.js'
import { RunOptions } from '../cli.js'

const debug = createDebug('cli:cmd:aws')

/** Fetch AWS resources and merge into Airtable */
export async function updateAwsRecords(opts: RunOptions) {
  debug('#updateAwsRecords')

  // Fetch buckets
  const buckets = await aws.getBuckets()
  const newBucketRecords = buckets.map((b) => ({
    Name: b.Name ?? 'Unnamed',
    Type: 'bucket',
  }))
  debug(
    'Found buckets %o',
    buckets.map((c) => c.Name)
  )

  // Fetch lightsail instances
  const lightsails = await aws.getLightsails()
  const lightsailPrices = await aws.getLightsailPrices()
  const newLightsailRecords = lightsails.map((l) => ({
    Name: l.name ?? 'Unnamed',
    Type: 'lightsail',
    Cost: l.bundleId && lightsailPrices.get(l.bundleId),
  }))
  debug(
    'Found lightsails %o',
    lightsails.map((l) => l.name)
  )

  // Fetch domains
  const domains = await aws.getDomains()
  const newDomainRecords = domains.map((d) => ({
    Name: d.DomainName,
    Type: 'domain',
  }))
  debug(
    'Found domains %o',
    domains.map((d) => d.DomainName)
  )

  // Fetch databases
  const databases = await aws.getDatabases()
  const newDatabaseRecords = databases.map((d) => ({
    Name: d.DBName ?? 'Unnamed',
    Type: 'database',
  }))
  debug(
    'Found databases %o',
    databases.map((d) => d.DBName)
  )

  // Get the AWS table
  const table = airtable
    .base(appConfig.base)
    .table<MergableRecord>(appConfig.tables.aws)

  // Merge in the new records and return a single MergeResult
  return combineMergeResults(
    await mergeAirtableRecords(table, 'bucket', newBucketRecords, opts),
    await mergeAirtableRecords(table, 'lightsail', newLightsailRecords, opts),
    await mergeAirtableRecords(table, 'domain', newDomainRecords, opts),
    await mergeAirtableRecords(table, 'database', newDatabaseRecords, opts)
  )
}

/** AWS data commands handlers */
export const awsData = {
  buckets: aws.getBuckets,
  lightsails: aws.getLightsails,
  domains: aws.getDomains,
  databases: aws.getDatabases,
}
