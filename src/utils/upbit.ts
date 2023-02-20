import { createHash } from 'crypto'
import { encode } from 'querystring'

import { RateLimit } from 'async-sema'
import { sign } from 'jsonwebtoken'
import fetch from 'node-fetch'
import { v4 as uuidv4 } from 'uuid'

import { Asset, UpbitCandle, UpbitError, UpbitOrder, UpbitOrderDetail } from '../types/upbit'
import { UPBIT_API_URL, UPBIT_OPEN_API_ACCESS_KEY, UPBIT_OPEN_API_SECRET_KEY } from './constants'
import { logWriter } from './writer'
import { printNow } from '.'

const rateLimit = RateLimit(8)

function createToken(query?: string) {
  return query
    ? sign(
        {
          access_key: UPBIT_OPEN_API_ACCESS_KEY,
          nonce: uuidv4(),
          query_hash: createHash('sha512').update(query, 'utf-8').digest('hex'),
          query_hash_alg: 'SHA512',
        },
        UPBIT_OPEN_API_SECRET_KEY
      )
    : sign(
        {
          access_key: UPBIT_OPEN_API_ACCESS_KEY,
          nonce: uuidv4(),
        },
        UPBIT_OPEN_API_SECRET_KEY
      )
}

export async function getAssets() {
  await rateLimit()

  const response = await fetch(`${UPBIT_API_URL}/v1/accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${createToken()}`,
    },
  })

  if (!response.ok) {
    logWriter.write(`${printNow()}, ${await response.text()}\n`)
    return null
  }

  const result = (await response.json()) as Asset[] & UpbitError

  if (result.error) {
    logWriter.write(`${printNow()}, ${result.error}\n`)
    return null
  }

  return result as Asset[]
}

type MinuteCandleInput = {
  market: string
  to?: string
  count?: number
}

export async function getMinuteCandles(unit: number, body: MinuteCandleInput) {
  let query = encode(body)

  await rateLimit()

  const response = await fetch(`${UPBIT_API_URL}/v1/candles/minutes/${unit}?${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${createToken(query)}`,
    },
  })

  if (!response.ok) {
    logWriter.write(`${printNow()}, ${await response.text()}\n`)
    return null
  }

  const result = (await response.json()) as UpbitCandle[] & UpbitError

  if (result.error) {
    logWriter.write(`${printNow()}, ${result.error}\n`)
    return null
  }

  return result as UpbitCandle[]
}

type GetOrdersBody = {
  market: string
  state?: string
  states?: string[]
  page?: number
  limit?: number
}

export async function getOrders(body: GetOrdersBody) {
  const states = body.states
  delete body.states

  let query = encode(body)

  if (states) {
    query += states.map((state) => `&states[]=${state}`).join('')
  }

  await rateLimit()

  const response = await fetch(`${UPBIT_API_URL}/v1/orders?${query}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${createToken(query)}`,
    },
  })

  if (!response.ok) {
    logWriter.write(`${printNow()}, ${await response.text()}\n`)
    return null
  }

  const result = (await response.json()) as UpbitOrderDetail[] & UpbitError

  if (result.error) {
    logWriter.write(`${printNow()}, ${result.error}\n`)
    return null
  }

  return result
}

export async function cancelOrder(uuid: string) {
  const query = encode({ uuid })

  logWriter.write(`${printNow()}, Cancel order ${uuid}\n`)

  await rateLimit()

  const response = await fetch(`${UPBIT_API_URL}/v1/order?${query}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${createToken(query)}`,
    },
  })

  if (!response.ok) {
    logWriter.write(`${printNow()}, ${await response.text()}\n`)
    return null
  }

  const result = (await response.json()) as UpbitOrder[] & UpbitError

  if (result.error) {
    logWriter.write(`${printNow()}, ${result.error}\n`)
    return null
  }

  return result as UpbitOrder[]
}

type OrderCoinBody = {
  market: string
  ord_type: 'limit' | 'price' | 'market'
  side: 'bid' | 'ask'
  price?: string
  volume?: string
}

export async function orderCoin(body: OrderCoinBody) {
  await rateLimit()

  const response = await fetch(`${UPBIT_API_URL}/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${createToken(encode(body))}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    logWriter.write(`${printNow()}, ${await response.text()}\n`)
    return null
  }

  const result = (await response.json()) as UpbitOrder & UpbitError

  if (result.error) {
    logWriter.write(`${printNow()}, ${result.error}\n`)
    return null
  }

  return result as UpbitOrder
}
