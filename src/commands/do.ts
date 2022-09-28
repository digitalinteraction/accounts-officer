import createDebug from 'debug'

import {
  airtable,
  combineMergeResults,
  MergableRecord,
  mergeAirtableRecords,
} from '../services/airtable.js'
import {
  getSizeCosts,
  getDroplets,
  getClusters,
  getDatabases,
  getVolumes,
  getSnapshots,
  getLoadBalancers,
} from '../services/do.js'
import { appConfig } from '../lib/config.js'
import { RunOptions } from '../cli.js'

const DO_VOLUME_COST_PER_GB = 0.1
const DO_SNAPSHOT_COST_PER_GB = 0.05
const DO_LOAD_BALANCER_COSTS = new Map(
  Object.entries({
    'lb-small': 10,
    'lb-medium': 30,
    'lb-large': 60,
  })
)

const debug = createDebug('cli:cmd:do')

/** Fetch DigitalOcean resources and merge into AirTable */
export async function updateDigitalOceanRecords(options: RunOptions) {
  debug('#updateDigitalOceanRecords')

  const sizeCosts = await getSizeCosts()
  debug('Found %o sizes', sizeCosts.size)

  //
  // Droplets
  //
  const droplets = await getDroplets()
  const newDropletRecords = droplets.map((d) => ({
    Name: d.name,
    Type: 'droplet',
    Cost: sizeCosts.get(d.size_slug),
  }))
  debug(
    'Found droplets %o',
    droplets.map((d) => d.name)
  )

  const backupIds = new Set(
    droplets
      .map((d) => d.backup_ids)
      .flat()
      .map((id) => id.toString())
  )
  debug('Backup ids %o', backupIds)

  //
  // Kubernetes Clusters
  //
  const clusters = await getClusters()
  const newClusterRecords = clusters.map((c) => {
    let cost = 0
    for (const p of c.node_pools) {
      cost += (sizeCosts.get(p.size) ?? 0) * p.count
    }
    return {
      Name: c.name,
      Type: 'cluster',
      Cost: cost,
    }
  })
  debug(
    'Found clusters %o',
    clusters.map((c) => c.name)
  )

  //
  // Databases
  // -> Cost isn't programable at this time
  //
  const databases = await getDatabases()
  const newDatabaseRecords = databases.map((d) => ({
    Name: d.name,
    Type: 'database',
  }))
  debug(
    'Found databases %o',
    databases.map((d) => d.name)
  )

  //
  // Volumes
  //
  const volumes = await getVolumes()
  const newVolumeRecords = volumes.map((v) => ({
    Name: v.name,
    Type: 'volume',
    Cost: v.size_gigabytes * DO_VOLUME_COST_PER_GB,
  }))
  debug(
    'Found volumes %o',
    volumes.map((c) => c.name)
  )

  //
  // Snapshots
  //
  const snapshots = await getSnapshots()
  const nonBackupsSnapshots = snapshots.filter((s) => !backupIds.has(s.id))
  const newSnapshotRecords = nonBackupsSnapshots.map((s) => ({
    Name: s.name,
    Type: 'snapshot',
    Cost: s.size_gigabytes * DO_SNAPSHOT_COST_PER_GB,
  }))
  debug('Found %o snapshots', snapshots.length)

  //
  // Loadbalancers
  //
  const loadbalancers = await getLoadBalancers()
  const newLoadbalancers = loadbalancers.map((l) => ({
    Name: l.name,
    Type: 'loadbalancer',
    Cost: DO_LOAD_BALANCER_COSTS.get(l.size) ?? undefined,
  }))

  // Get the DO table
  const table = airtable
    .base(appConfig.base)
    .table<MergableRecord>(appConfig.tables.do)

  //
  // Merge in the new records and return a single MergeResult
  //
  return combineMergeResults(
    await mergeAirtableRecords(table, 'droplet', newDropletRecords, options),
    await mergeAirtableRecords(table, 'cluster', newClusterRecords, options),
    await mergeAirtableRecords(table, 'database', newDatabaseRecords, options),
    await mergeAirtableRecords(table, 'volume', newVolumeRecords, options),
    await mergeAirtableRecords(table, 'snapshot', newSnapshotRecords, options),
    await mergeAirtableRecords(table, 'loadbalancer', newLoadbalancers, options)
  )
}

/** DO data commands handlers */
export const doData = {
  droplets: getDroplets,
  clusters: getClusters,
  databases: getDatabases,
  volumes: getVolumes,
  sizes: () => getSizeCosts().then((s) => Object.fromEntries(s.entries())),
  snapshots: getSnapshots,
  loadbalancers: getLoadBalancers,
}
