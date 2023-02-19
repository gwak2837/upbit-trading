import { createHash } from 'crypto'
import { encode } from 'querystring'

import { sign } from 'jsonwebtoken'
import fetch from 'node-fetch'
import { v4 as uuidv4 } from 'uuid'

import { Asset, UpbitCandle, UpbitError, UpbitOrder, UpbitOrderDetail } from '../types/upbit'
import { UPBIT_API_URL, UPBIT_OPEN_API_ACCESS_KEY, UPBIT_OPEN_API_SECRET_KEY } from './config'
import { logWriter } from './writer'
import { printNow } from '.'

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
  return (await (
    await fetch(`${UPBIT_API_URL}/v1/accounts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${createToken()}`,
      },
    })
  ).json()) as Asset[] & UpbitError
}

type MinuteCandleInput = {
  market: string
  to?: string
  count?: number
}

export async function getMinuteCandles(unit: number, body: MinuteCandleInput) {
  let query = encode(body)

  return (await (
    await fetch(`${UPBIT_API_URL}/v1/candles/minutes/${unit}?${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${createToken(query)}`,
      },
    })
  ).json()) as UpbitCandle[] & UpbitError
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

  return (await (
    await fetch(`${UPBIT_API_URL}/v1/orders?${query}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${createToken(query)}`,
      },
    })
  ).json()) as UpbitOrderDetail[] & UpbitError
}

export async function cancelOrder(uuid: string) {
  const query = encode({ uuid })

  logWriter.write(`${printNow()}, Cancel order\n`)

  return (await (
    await fetch(`${UPBIT_API_URL}/v1/order?${query}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${createToken(query)}`,
      },
    })
  ).json()) as UpbitOrder[] & UpbitError
}

type OrderCoinBody = {
  market: string
  ord_type: 'limit' | 'price' | 'market'
  side: 'bid' | 'ask'
  price?: string
  volume?: string
}

export async function orderCoin(body: OrderCoinBody) {
  return (await (
    await fetch(`${UPBIT_API_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(encode(body))}`,
      },
      body: JSON.stringify(body),
    })
  ).json()) as UpbitOrder & UpbitError
}

export function ceilUpbitPrice(price: number) {
  let formattedPrice

  if (price >= 2_000_000) {
    formattedPrice = Math.ceil(price / 1000) * 1000
  } else if (price >= 1_000_000) {
    formattedPrice = Math.ceil(price / 500) * 500
  } else if (price >= 500_000) {
    formattedPrice = Math.ceil(price / 100) * 100
  } else if (price >= 100_000) {
    formattedPrice = Math.ceil(price / 50) * 50
  } else if (price >= 10_000) {
    formattedPrice = Math.ceil(price / 10) * 10
  } else if (price >= 1_000) {
    formattedPrice = Math.ceil(price / 5) * 5
  } else if (price >= 100) {
    formattedPrice = Math.ceil(price / 1) * 1
  } else if (price >= 10) {
    formattedPrice = Math.ceil(price / 0.1) * 0.1
  } else if (price >= 1) {
    formattedPrice = Math.ceil(price / 0.01) * 0.01
  } else {
    throw new Error('1원 미만의 코인은 거래할 수 없습니다.')
  }

  return formattedPrice
}

export function getCoinUnit(COIN_CODE: string) {
  switch (COIN_CODE) {
    case 'KRW-BTC':
      return 8
    default:
      return 0
  }
}

export function getMoneyRatio(assets: Asset[], currentPrice: number) {
  let moneyAmount = 0
  let totalAmount = 0

  for (const asset of assets) {
    if (asset.currency === 'KRW') {
      moneyAmount += +asset.balance
      totalAmount += +asset.balance
    } else {
      totalAmount += +asset.balance * currentPrice
    }
  }

  return (moneyAmount * 100) / totalAmount
}
