import createDebug from 'debug'
import got, { RequestError, TimeoutError, MaxRedirectsError } from 'got'
import { RunOptions } from '../cli.js'

import {
  airtable,
  combineMergeResults,
  MergableRecord,
  mergeAirtableRecords,
} from '../services/airtable.js'
import { appConfig } from '../lib/config.js'
import { getDomains } from '../services/godaddy.js'

const debug = createDebug('cli:cmd:godaddy')

/** Take a string-encoded date-time and output as yyyy-mm-dd */
function dateify(dateString: string) {
  if (!dateString) return undefined
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
}

/** Fetch GoDaddy records and merge into Airtable */
export async function updateGoDaddyRecords(options: RunOptions) {
  debug('#updateGoDaddyRecords')

  // Fetch domains
  const domains = await getDomains()
  debug(
    'Found domains %o',
    domains.map((d) => d.domain)
  )

  // Create records from the domains
  const newDomainRecords = domains.map((d) => ({
    Name: d.domain,
    Type: 'domain',
    Expires: dateify(d.expires),
    HttpResponse: '',
  }))

  // Poll each domain in parallel
  for (const record of newDomainRecords) {
    record.HttpResponse = await pollDomain(record.Name)
  }

  // Update domain records
  const table = airtable
    .base(appConfig.base)
    .table<MergableRecord>(appConfig.tables.godaddy)

  return combineMergeResults(
    await mergeAirtableRecords(table, 'domain', newDomainRecords, options)
  )
}

export const godaddyData = {
  domains: getDomains,
}

/** perform a http GET with a domain to see if it is active */
async function pollDomain(domain: string) {
  try {
    // Try a http GET request to the route, handling any errors
    const res = await got(`http://${domain}`, {
      followRedirect: true,
      throwHttpErrors: false,
      timeout: { request: 5000 },
    })

    debug('poll %o status=%o', domain, res.statusCode)

    return `${res.statusMessage ?? 'Unknown'} - ${res.statusCode}`
  } catch (error) {
    if (error instanceof RequestError) {
      return `Error - ${error.code ?? 'UNKNOWN'}`
    }
    if (error instanceof TimeoutError) {
      return `Error - Timeout`
    }
    if (error instanceof MaxRedirectsError) {
      return `Error - Too many redirects`
    }
    return `Error - ${(error as Error)?.message ?? 'UNKNOWN'}`
  }
}
