import { getOrder } from './lib/upbit'
import fs from 'fs'

const orderWriter = fs.createWriteStream('docs/order.txt').on('finish', () => {
  console.log('finish')
})

;(async () => {
  const order = await getOrder('ec5ee649-0000-0000-0000-9954f3f391b0')

  orderWriter.write(`${JSON.stringify(order)}\n`)
})()
