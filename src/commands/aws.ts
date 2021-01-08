import createDebug from 'debug'

import {
  airtable,
  combineMergeResults,
  mergeAirtableRecords,
} from '../services/airtable'
import { appConfig } from '../services/config'
import * as aws from '../services/aws'

const debug = createDebug('cli:cmd:aws')

/** Fetch AWS resources and merge into Airtable */
export async function updateAwsRecords() {
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
  const table = airtable.base(appConfig.base).table(appConfig.tables.aws)

  // Merge in the new records and return a single MergeResult
  return combineMergeResults(
    await mergeAirtableRecords(table, 'bucket', newBucketRecords),
    await mergeAirtableRecords(table, 'lightsail', newLightsailRecords),
    await mergeAirtableRecords(table, 'domain', newDomainRecords),
    await mergeAirtableRecords(table, 'database', newDatabaseRecords)
  )
}

/** AWS data commands handlers */
export const awsData = {
  buckets: aws.getBuckets,
  lightsails: aws.getLightsails,
  domains: aws.getDomains,
  databases: aws.getDatabases,
}
