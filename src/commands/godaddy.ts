import createDebug from 'debug'
import got from 'got'

import {
  airtable,
  combineMergeResults,
  mergeAirtableRecords,
} from '../services/airtable'
import { appConfig } from '../services/config'
import { getDomains } from '../services/godaddy'

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
export async function updateGoDaddyRecords() {
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
  await Promise.all(
    newDomainRecords.map(async (d) => {
      d.HttpResponse = await pollDomain(d.Name)
    })
  )

  // Update domain records
  const table = airtable.base(appConfig.base).table(appConfig.tables.godaddy)
  return combineMergeResults(
    await mergeAirtableRecords(table, 'domain', newDomainRecords)
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
      timeout: 5000,
    })

    debug('poll %o status=%o', domain, res.statusCode)

    return `${res.statusMessage ?? 'Unknown'} - ${res.statusCode}`
  } catch (error) {
    if (error instanceof got.RequestError) {
      return `Error - ${error.code ?? 'UNKNOWN'}`
    }
    if (error instanceof got.TimeoutError) {
      return `Error - Timeout`
    }
    if (error instanceof got.MaxRedirectsError) {
      return `Error - Too many redirects`
    }
    return `Error - ${error?.message ?? 'UNKNOWN'}`
  }
}
