//
// https://developer.godaddy.com/doc/endpoint/domains
// TODO: investigate GoDaddy pagination
// -> it doesn't seem to paginate
//

import got from 'got'
import { env } from '../services/env'

/** A "got" instance authenticated to talk to the GoDaddy API */
export const godaddy = got.extend({
  prefixUrl: 'https://api.godaddy.com',
  headers: {
    authorization: `sso-key ${env.GODADDY_API_KEY}:${env.GODADDY_API_SECRET}`,
  },
})

/** A partial-typing of a GoDaddy domain */
export type GoDaddyDomains = Array<{
  domain: string
  expires: string
}>

/** Get GoDaddy domains that are active */
export async function getDomains() {
  const response = await godaddy('v1/domains', {
    searchParams: {
      statuses: 'ACTIVE',
    },
  }).json<GoDaddyDomains>()
  return response
}
