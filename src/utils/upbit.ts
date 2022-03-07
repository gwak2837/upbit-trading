import { createHash } from 'crypto'
import { encode } from 'querystring'

import { sign } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

import { Asset, UpbitError, UpbitOrder, UpbitOrderDetail } from '../types/upbit'
import { fetchWithInterval } from '.'

export const UPBIT_API_URL = 'https://api.upbit.com'
export const ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''

if (!ACCESS_KEY || !SECRET_KEY) throw new Error('ACCESS_KEY, SECRET_KEY 환경 변수를 설정해주세요')

function createToken(query?: string) {
  return query
    ? sign(
        {
          access_key: ACCESS_KEY,
          nonce: uuidv4(),
          query_hash: createHash('sha512').update(query, 'utf-8').digest('hex'),
          query_hash_alg: 'SHA512',
        },
        SECRET_KEY
      )
    : sign(
        {
          access_key: ACCESS_KEY,
          nonce: uuidv4(),
        },
        SECRET_KEY
      )
}

export function getAssets() {
  return fetchWithInterval<Asset[]>(UPBIT_API_URL + '/v1/accounts', {
    method: 'GET',
    headers: { Authorization: `Bearer ${createToken()}` },
  })
}

export function getOrder(uuid: string) {
  const query = encode({ uuid })

  return fetchWithInterval<UpbitOrderDetail>(UPBIT_API_URL + '/v1/order?' + query, {
    method: 'GET',
    headers: { Authorization: `Bearer ${createToken(query)}` },
  })
}

type GetOrdersBody = {
  market: string
  limit: number
}

export function getOrders(body: GetOrdersBody) {
  const query = encode(body)

  return fetchWithInterval<UpbitOrderDetail[] & UpbitError>(UPBIT_API_URL + '/v1/orders?' + query, {
    method: 'GET',
    headers: { Authorization: `Bearer ${createToken(query)}` },
  })
}

type OrderCoinBody = {
  market: string
  ord_type: 'limit' | 'price' | 'market'
  side: 'bid' | 'ask'
  price?: string
  volume?: string
}

export function orderCoin(body: OrderCoinBody) {
  return fetchWithInterval<UpbitOrder & UpbitError>(UPBIT_API_URL + '/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${createToken(encode(body))}`,
    },
    body: JSON.stringify(body),
  })
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
      moneyAmount += Number(asset.balance)
      totalAmount += Number(asset.balance)
    } else {
      totalAmount += Number(asset.balance) * currentPrice
    }
  }

  return (moneyAmount * 100) / totalAmount
}