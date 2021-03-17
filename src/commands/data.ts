import { awsData } from './aws'
import { doData } from './do'
import { godaddyData } from './godaddy'
import { sendgridData } from './sendgrid'
import { vercelData } from './vercel'

//
// Data
//
export const dataTypes: Record<string, Record<string, Function>> = {
  do: doData,
  godaddy: godaddyData,
  aws: awsData,
  sendgrid: sendgridData,
  vercel: vercelData,
}

export async function runDataCommand(
  serviceName: string,
  resourceName: string
) {
  const service = dataTypes[serviceName]
  if (!service) throw new Error(`Unknown service '${serviceName}'`)

  const allowedResources = Object.keys(service)
    .map((k) => `"${k}"`)
    .join(', ')

  if (!resourceName) {
    console.log(`Available ${serviceName} resources: ${allowedResources}`)
    return
  }

  const resource = service[resourceName]
  if (!resource) {
    throw new Error(
      `Unknown resource '${serviceName}.${resourceName}', options: ${allowedResources}`
    )
  }

  const result = await resource()
  console.log(JSON.stringify(result, null, 2))
}
