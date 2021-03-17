import got from 'got'
import { env } from '../services/env'

// curl "https://api.vercel.com/v2/teams/team_ofwUZockJlL53hINUGCc1ONW/members" \
// -H "Authorization: Bearer <TOKEN>"

export const vercel = got.extend({
  prefixUrl: 'https://api.vercel.com/v2',
  headers: {
    authorization: `bearer ${env.VERCEL_TOKEN}`,
  },
  responseType: 'json',
})

export interface VercelMember {
  uid: string
  role: 'OWNER' | 'MEMBER'
  email: string
  username: string
  confirmed: boolean
}

export function getTeamMembers() {
  return vercel
    .get(`teams/${env.VERCEL_TEAM_ID}/members`)
    .json<Record<'members', VercelMember[]>>()
    .then((r) => r.members)
}
