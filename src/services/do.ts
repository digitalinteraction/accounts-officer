//
// https://developers.digitalocean.com/documentation/v2/
// max 5,000 requests per hour
//

import createDebug from 'debug'
import got, { PaginationOptions } from 'got'
import { env } from '../lib/env.js'

const debug = createDebug('cli:service:do')

// TODO: look into do-wrapper library
// import DigitalOcean from 'do-wrapper'
// export const doWrap = new DigitalOcean(env.DO_API_KEY)

/** A partial-typing of a DO droplet */
export interface DoDroplet {
  id: string
  name: string
  size_slug: string
  image: {
    name: string
  }
  backup_ids: number[]
}

/** A partial-typing of a DO droplet size */
export interface DoSize {
  slug: string
  price_monthly: number
}

/** A partial-typing of a DO kubernetes cluster */
export interface DoCluster {
  name: string
  node_pools: Array<{
    name: string
    size: string
    count: number
  }>
}

/** A partial-typing of a DO database */
export interface DoDatabase {
  name: string
  size: string
  num_nodes: number
}

/** A partial-typing of a DO volume */
export interface DoVolume {
  name: string
  size_gigabytes: number
}

/** A partial-typing of a DO snapshot */
export interface DoSnapshot {
  id: string
  name: string
  size_gigabytes: number
}

/** A partial-typing of a DO loadbalancer */
export interface DoLoadBalancer {
  id: string
  name: string
  ip: string
  size: string
}

/** A "got" instance to talk to the DO v2 API */
export const digitalOcean = got.extend({
  prefixUrl: 'https://api.digitalocean.com/v2',
  headers: {
    authorization: `bearer ${env.DO_API_KEY}`,
  },
  responseType: 'json',
  searchParams: {
    per_page: 50,
  },
})

/**
 * Create a got pagination object to paginate DigitalOcean resources
 */
interface DoLinks {
  links: {
    pages: {
      first?: string
      prev?: string
      next?: string
      last?: string
    }
  }
}
function paginator<T, K extends string>(
  key: K
): PaginationOptions<T, DoLinks & Record<K, T[]>> {
  return {
    // A method to transform a http response into an array of items
    transform(response) {
      debug('page=%o', response.requestUrl.toString())
      return response.body[key]
    },

    // A method to take a response and return new search params for the next response
    // or return false if pagination is complete
    paginate(data) {
      try {
        const { links } = data.response.body
        const next = links?.pages?.next ? new URL(links.pages.next) : null

        if (!next) return false

        return {
          searchParams: {
            page: next.searchParams.get('page'),
          },
        }
      } catch (error) {
        return false
      }
    },
  }
}

/** Get DO droplet sizes and put into a Map */
export async function getSizeCosts() {
  const sizes = await digitalOcean.paginate.all('sizes', {
    pagination: paginator<DoSize, 'sizes'>('sizes'),
  })

  const map = new Map<string, number>()

  for (const size of sizes) {
    map.set(size.slug, size.price_monthly)
  }

  return map
}

/** Get DO droplets and filter out Kubernetes nodes */
export async function getDroplets() {
  const droplets = await digitalOcean.paginate.all('droplets', {
    pagination: paginator<DoDroplet, 'droplets'>('droplets'),
  })

  return droplets.filter((droplet) => !droplet.image.name.startsWith('do-kube'))
}

/** Get DO Kubernetes clusters */
export async function getClusters() {
  return digitalOcean.paginate.all('kubernetes/clusters', {
    pagination: paginator<DoCluster, 'kubernetes_clusters'>(
      'kubernetes_clusters'
    ),
  })
}

/** Get DO databases */
export async function getDatabases() {
  return digitalOcean.paginate.all('databases', {
    pagination: paginator<DoDatabase, 'databases'>('databases'),
  })
}

/** Get DO volumes */
export async function getVolumes() {
  return digitalOcean.paginate.all('volumes', {
    pagination: paginator<DoVolume, 'volumes'>('volumes'),
  })
}

/** Get DO snapshots */
export async function getSnapshots() {
  return digitalOcean.paginate.all('snapshots', {
    pagination: paginator<DoSnapshot, 'snapshots'>('snapshots'),
  })
}

/** Get DO load balancers */
export async function getLoadBalancers() {
  return digitalOcean.paginate.all('load_balancers', {
    pagination: paginator<DoLoadBalancer, 'load_balancers'>('load_balancers'),
  })
}
