import Airtable = require('airtable')
import createDebug from 'debug'

import AirtableQuery = require('airtable/lib/query')
import AirtableRecord = require('airtable/lib/record')
import AirtableTable = require('airtable/lib/table')
import { doc } from 'prettier'

const debug = createDebug('cli:service:airtable')

export { Airtable, AirtableQuery, AirtableRecord, AirtableTable }

/** A record that can be merged into Airtable */
export interface MergableRecord {
  Name: string
  Type: string
}

/** An aggregated result of a merge of records */
export interface MergeResult {
  unlinked: number
  updated: number
  created: number
}

// Reads in AIRTABLE_API_KEY
export const airtable = new Airtable()

/** Traverse Airtable's pagination API to get all records that match a query */
function findAllRecords(query: AirtableQuery): Promise<AirtableRecord[]> {
  return new Promise((resolve, reject) => {
    const allRecords = <AirtableRecord[]>[]

    query.eachPage(
      (records, next) => {
        allRecords.push(...records)
        next()
      },
      (err: any) => {
        if (err) reject(err)
        else resolve(allRecords)
      }
    )
  })
}

/** Whether a record needs updating based on a new value */
function hasChanged<T extends MergableRecord>(a: AirtableRecord, b: T) {
  for (const key in b) {
    if (a.get(key) !== b[key]) {
      return true
    }
  }
  return false
}

/**
 * Merge a new set of records of a given record type into an Airtable table.
 * Should be called once per table-type e.g. once for "buckets" in the AWS table
 * - unlinks records that don't exist anymore
 * - updates records that do exists
 * - creates records that do not exists
 */
export async function mergeAirtableRecords<T extends MergableRecord>(
  table: AirtableTable,
  recordType: string,
  toMerge: T[]
): Promise<MergeResult> {
  debug('mergeRecords table=%o type=%o', table.name, recordType)
  const allRecords = await findAllRecords(table.select({ view: 'Grid view' }))

  const toCreate: any[] = []
  const toUpdate: any[] = []

  //
  // 1 - Go through each existing record to see of they are obsolete
  //
  const typedRecords = allRecords.filter((r) => r.get('Type') === recordType)

  for (const record of typedRecords) {
    const matchingRecord = toMerge.some(
      (item) => item.Name === record.get('Name') && item.Type === recordType
    )

    // Mark it as unlinked if it doesn't exist and isn't already unlinked
    if (!matchingRecord && record.get('Status') !== 'unlinked') {
      debug(
        'record is now unlinked name=%o type=%o',
        record.get('Name'),
        recordType
      )

      toUpdate.push({
        id: record.id,
        fields: {
          Status: 'unlinked',
        },
      })
    }
  }

  const unlinkedCount = toUpdate.length

  //
  // 2 - Loop through records to merge and prepare to 'create' or 'update' them
  //
  for (const item of toMerge) {
    const matchingRecord = typedRecords.find(
      (r) => r.get('Name') === item.Name && r.get('Type') === recordType
    )

    if (matchingRecord) {
      // If there is a matching record and it is different, prepare an update
      if (hasChanged(matchingRecord, item)) {
        debug('Update type=%o name=%o', item.Type, item.Name)
        toUpdate.push({
          id: matchingRecord.id,
          fields: item,
        })
      } else {
        debug('Unchanged type=%o name=%o', item.Type, item.Name)
      }
    } else {
      debug('Create type=%o name=%o', item.Type, item.Name)

      // If there is no matching record, create one
      toCreate.push({
        fields: {
          ...item,
          Status: 'active',
        },
      })
    }
  }

  // Perform creations in groups of 10 (that's the Airtable limit)
  if (toCreate.length > 0) {
    debug('Creating %o new records', toCreate.length)
    for (const page of chunkify(toCreate, 10)) {
      await table.create(page)
    }
  }

  // Perform updates in groups of 10 (that's the Airtable limit)
  if (toUpdate.length > 0) {
    debug('Updating %o records', toUpdate.length)
    for (const page of chunkify(toUpdate, 10)) {
      await table.update(page)
    }
  }

  // Return counts of the operations performed
  return {
    unlinked: unlinkedCount,
    updated: toUpdate.length - unlinkedCount,
    created: toCreate.length,
  }
}

// From: https://www.w3resource.com/javascript-exercises/fundamental/javascript-fundamental-exercise-265.php
function chunkify<T>(array: T[], chunkSize: number) {
  const length = Math.ceil(array.length / chunkSize)

  return Array.from({ length }, (_, i) =>
    array.slice(i * chunkSize, i * chunkSize + chunkSize)
  )
}

/** Combine several MergeResult counts together by summing up their components */
export function combineMergeResults(...results: MergeResult[]): MergeResult {
  return results.reduce(
    (sum, current) => ({
      unlinked: sum.unlinked + current.unlinked,
      updated: sum.updated + current.updated,
      created: sum.created + current.created,
    }),
    { unlinked: 0, updated: 0, created: 0 }
  )
}

//
// EXPERIMENTAL
// provide an array of resources to fetch and merge into Airtable
//

/** A definition of a resource and how to fetch records */
export interface ResourceService {
  type: string
  fetch(): Promise<MergableRecord[]>
}

/** A set of records for a given type, like "vm" or "bucket" resources */
export interface ResourceRecords {
  type: string
  records: MergableRecord[]
}

/** Process a set of resources and merge them into an Airtable table */
export async function fetchAndMerge(
  table: AirtableTable,
  input: ResourceService[]
) {
  // Fetch all records together
  const typedRecords: ResourceRecords[] = []

  for (const { type, fetch } of input) {
    const records = await fetch()
    typedRecords.push({ type, records })
    debug('Found %o %s resources', records.length, type)
  }

  // Merge records and return a combined result
  let results: MergeResult = {
    unlinked: 0,
    updated: 0,
    created: 0,
  }
  for (const { type, records } of typedRecords) {
    results = combineMergeResults(
      results,
      await mergeAirtableRecords(table, type, records)
    )
  }

  return results
}
