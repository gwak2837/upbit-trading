import { createHash } from 'crypto'
import { encode } from 'querystring'

import { sign } from 'jsonwebtoken'
import request from 'request'
import { v4 as uuidv4 } from 'uuid'

import { UpbitError, UpbitOrder, UpbitOrderDetail } from './types/upbit'
import { ACCESS_KEY, SECRET_KEY, SERVER_URL } from './utils/options'

function createToken(query: string) {
  return sign(
    {
      access_key: ACCESS_KEY,
      nonce: uuidv4(),
      query_hash: createHash('sha512').update(query, 'utf-8').digest('hex'),
      query_hash_alg: 'SHA512',
    },
    SECRET_KEY
  )
}

type OrderBody = {
  market: string
  ord_type: string
  side: string
  price?: string
  volume?: string
}

export function order(body: OrderBody) {
  const token = createToken(encode(body))

  const options = {
    method: 'POST',
    url: SERVER_URL + '/v1/orders',
    headers: { Authorization: `Bearer ${token}` },
    json: body,
  }

  return new Promise<UpbitOrder>((resolve, reject) => {
    request(options, (error, __, body) => {
      if (error) reject(error)
      resolve(body)
    })
  })
}

export function cancelOrder(uuid: string) {
  const body = { uuid }
  const query = encode(body)

  const options = {
    method: 'DELETE',
    url: SERVER_URL + '/v1/order?' + query,
    headers: { Authorization: `Bearer ${createToken(query)}` },
    json: body,
  }

  return new Promise<Record<string, string>>((resolve, reject) => {
    request(options, (error, __, body) => {
      if (error) reject(error)
      resolve(body)
    })
  })
}

export function getOrder(uuid: string) {
  const body = { uuid }
  const query = encode(body)

  const options = {
    method: 'GET',
    url: SERVER_URL + '/v1/order?' + query,
    headers: { Authorization: `Bearer ${createToken(query)}` },
    json: body,
  }

  return new Promise<UpbitOrderDetail>((resolve, reject) => {
    request(options, (error, __, body) => {
      if (error) reject(error)
      resolve(body)
    })
  })
}

export function getOrders(body: any) {
  const query = encode(body)

  const options = {
    method: 'GET',
    url: SERVER_URL + '/v1/orders?' + query,
    headers: { Authorization: `Bearer ${createToken(query)}` },
    json: body,
  }

  return new Promise<UpbitOrderDetail[] & UpbitError>((resolve, reject) => {
    request(options, (error, __, body) => {
      if (error) reject(error)
      resolve(body)
    })
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
