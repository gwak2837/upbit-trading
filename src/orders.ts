import { getOrders } from './lib/upbit'
import fs from 'fs'

const ordersWriter = fs.createWriteStream('docs/orders.txt').on('finish', () => {
  console.log('finish')
})

;(async () => {
  const orders = await getOrders({
    state: ['done', 'cancel'],
    limit: 100,
  })

  const bidOrders = orders.filter((order) => order.side === 'bid')

  bidOrders.forEach((order) => {
    ordersWriter.write(`${JSON.stringify(order)}\n`)
  })
})()
