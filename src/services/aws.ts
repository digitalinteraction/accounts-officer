import AWS from 'aws-sdk'

// Loads in AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
// ref: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html

const LIGHTSAIL_REGION = 'eu-west-2'
const RDS_REGION = 'eu-west-2'
const ROUTE53_REGION = 'us-east-1'

/** Get AWS buckets */
export async function getBuckets() {
  const s3 = new AWS.S3()
  const { Buckets = [] } = await s3.listBuckets().promise()
  return Buckets
}

/** Get AWS lightsail prices and put into a Map */
export async function getLightsailPrices() {
  const ls = new AWS.Lightsail({ region: 'eu-west-2' })

  const { bundles = [] } = await ls
    .getBundles({ includeInactive: true })
    .promise()

  const prices = new Map<string, number>()

  for (const bundle of bundles) {
    prices.set(bundle.bundleId!, bundle.price!)
  }

  return prices
}

/** Get AWS lightsail instances */
export async function getLightsails() {
  const ls = new AWS.Lightsail({ region: LIGHTSAIL_REGION })
  const { instances = [] } = await ls.getInstances().promise()
  return instances
}

/** Get AWS domains, NOTE: currently will limit to 20 */
export async function getDomains() {
  const reg = new AWS.Route53Domains({ region: ROUTE53_REGION })
  const { Domains = [] } = await reg.listDomains().promise()
  return Domains
}

/** Get AWS RDS databases */
export async function getDatabases() {
  const rds = new AWS.RDS({ region: RDS_REGION })
  const { DBInstances = [] } = await rds.describeDBInstances().promise()
  return DBInstances
}
