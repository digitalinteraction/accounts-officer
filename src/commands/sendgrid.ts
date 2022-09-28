import createDebug from 'debug'
import { getApiKeys } from '../services/sendgrid.js'
import {
  airtable,
  combineMergeResults,
  MergableRecord,
  mergeAirtableRecords,
} from '../services/airtable.js'
import { appConfig } from '../lib/config.js'
import { RunOptions } from '../cli.js'

const debug = createDebug('cli:cmd:sendgrid')

export async function updateSendgridRecords(opts: RunOptions) {
  debug('#updateSendgridRecords')

  //
  // Get API keys
  //
  const apiKeys = await getApiKeys()
  const newApiKeyRecords = apiKeys.map((k) => ({
    Name: k.name,
    Type: 'apikey',
  }))
  debug('found %o apikeys', apiKeys.length)

  //
  // Merge into AirTable
  //
  const table = airtable
    .base(appConfig.base)
    .table<MergableRecord>(appConfig.tables.sendgrid)

  return combineMergeResults(
    await mergeAirtableRecords(table, 'apikey', newApiKeyRecords, opts)
  )
}

/** SendGrid data commands */
export const sendgridData = {
  apikeys: getApiKeys,
}
