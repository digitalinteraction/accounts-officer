import got, { PaginationOptions } from 'got'
import { env } from '../lib/env.js'

export const sendgrid = got.extend({
  prefixUrl: 'https://api.sendgrid.com/v3',
  headers: {
    authorization: `bearer ${env.SENDGRID_API_KEY}`,
  },
  responseType: 'json',
})

export interface SendGridResponse<T> {
  result: T[]
}

export interface SendGridApiKey {
  name: string
  api_key_id: string
}

function createPaginator<T>(): PaginationOptions<T, { result: T[] }> {
  return {
    transform(response) {
      return response.body.result
    },
  }
}

export async function getApiKeys() {
  return sendgrid.paginate.all('api_keys', {
    pagination: createPaginator<SendGridApiKey>(),
  })
}
