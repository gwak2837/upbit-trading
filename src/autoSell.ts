import fs from 'fs'

import { ceilUpbitPrice, getOrders, order as orderCoin } from './upbit'
import { sleep } from './utils/common'
import { logWriter } from './write'

const uuids = fs.readFileSync('docs/auto-sell.txt', 'utf8').split('\n')

const uuidWriter = fs.createWriteStream('docs/auto-sell.txt', { flags: 'a' }).on('finish', () => {
  console.log('finish')
})

;(async () => {
  console.log('auto selling started')

  while (true) {
    try {
      const orders = await getOrders({
        state: 'done',
        limit: 10,
      })

      if (orders.error) {
        console.log(orders.error)
        break
      }

      orders.forEach(async (order) => {
        const now = new Date().getTime()
        const orderCreationTime = new Date(order.created_at).getTime()

        const inLastHour = now - 3_600_000 < orderCreationTime
        const buyingOrder = order.side === 'bid'
        const newOrder = !uuids.includes(order.uuid)

        if (buyingOrder && inLastHour && newOrder) {
          const buyingOrderResult = await orderCoin({
            market: order.market,
            ord_type: 'limit',
            side: 'ask',
            price: `${ceilUpbitPrice(+order.price * 1.002)}`,
            volume: order.volume,
          })

          logWriter.write(`${new Date().toLocaleString()} ${JSON.stringify(buyingOrderResult)}\n`)

          if (buyingOrderResult.uuid) {
            uuidWriter.write(`${order.uuid}\n`)
            uuids.push(order.uuid)
          }

          await sleep(500)
        }
      })

      await sleep(3000)
    } catch (error) {
      console.log(new Date().toLocaleString(), error)
      await sleep(5000)
    }
  }
})()
