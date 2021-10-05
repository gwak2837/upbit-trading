import { getOrders } from './lib/upbit'
import fs from 'fs'
import { COIN_CODE, BUYING_ORDERS_MERGING_MAX_COUNT } from './utils/options'

const ordersWriter = fs.createWriteStream('docs/orders.txt').on('finish', () => {
  console.log('finish')
})

;(async () => {
  const orders = await getOrders({
    market: COIN_CODE,
    limit: BUYING_ORDERS_MERGING_MAX_COUNT,
  })

  const bidOrders = orders.filter((order) => order.side === 'ask')

  bidOrders.forEach((order) => {
    ordersWriter.write(`${JSON.stringify(order)}\n`)
  })
})()
