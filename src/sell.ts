import fs from 'fs'

import { sleep } from './utils/common'
import { AUTO_SELLING_RATIO } from './utils/options'
import { ceilUpbitPrice, getOrders, order as orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

const uuids = fs
  .readFileSync('docs/uuid.txt', {
    encoding: 'utf8',
    flag: 'a+',
  })
  .split('\n')

const uuidWriter = fs.createWriteStream('docs/uuid.txt', { flags: 'a' }).on('finish', () => {
  console.log('finish')
})

;(async () => {
  console.log('auto selling started')

  while (true) {
    try {
      const orders = await getOrders({
        state: ['done', 'cancel'],
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
            price: `${ceilUpbitPrice(+order.price * AUTO_SELLING_RATIO)}`,
            volume: order.volume,
          })

          logWriter.write(
            `${new Date().toLocaleString('ko-KR')} ${JSON.stringify(buyingOrderResult)}\n`
          )

          if (buyingOrderResult.uuid || buyingOrderResult.error.name === 'insufficient_funds_ask') {
            uuidWriter.write(`${order.uuid}\n`)
            uuids.push(order.uuid)
          }

          await sleep(1000)
        }
      })

      await sleep(2000)
    } catch (error) {
      console.log(new Date().toLocaleString(), error)
      await sleep(5000)
    }
  }
})()
