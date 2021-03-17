import createDebug from 'debug'
import { getApiKeys } from '../services/sendgrid'
import {
  airtable,
  combineMergeResults,
  mergeAirtableRecords,
} from '../services/airtable'
import { appConfig } from '../services/config'

const debug = createDebug('cli:cmd:sendgrid')

export async function updateSendgridRecords() {
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
  const table = airtable.base(appConfig.base).table(appConfig.tables.sendgrid)
  return combineMergeResults(
    await mergeAirtableRecords(table, 'apikey', newApiKeyRecords)
  )
}

/** SendGrid data commands */
export const sendgridData = {
  apikeys: getApiKeys,
}
