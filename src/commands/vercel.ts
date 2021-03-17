import createDebug from 'debug'
import { getTeamMembers } from '../services/vercel'

const debug = createDebug('cli:cmd:vercel')

export async function updateVercelRecords() {
  debug('#updateVercelRecords')

  const members = await getTeamMembers()
  debug('found %o', members.length)

  // ...
}

export const vercelData = {
  members: getTeamMembers,
}
