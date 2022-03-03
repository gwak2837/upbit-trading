import fs from 'fs'
import { exit } from 'process'

import { v4 } from 'uuid'
import WebSocket from 'ws'

import { Asset } from './types/upbit'
import { printNow } from './utils'
import { COIN_CODE, TICK_INTERVAL } from './utils/options'
import { ceilUpbitPrice, getAsset, getOrder } from './utils/upbit'
import { logWriter, startingDate } from './utils/writer'

let tickIth = 0

let asset: Asset
getAsset().then((newAsset) => (asset = newAsset))

const ws = new WebSocket('wss://api.upbit.com/websocket/v1')

ws.on('open', () => {
  console.log(`${printNow()} websocket open`)
  ws.send(
    JSON.stringify([
      {
        ticket: v4(),
      },
      {
        type: 'ticker',
        codes: [COIN_CODE],
        isOnlyRealtime: true,
      },
      {
        format: 'SIMPLE',
      },
    ])
  )
}).on('close', () => {
  console.log(`${printNow()} websocket closed`)
  logWriter.end()
  exit()
})

ws.on('message', async (data) => {
  const tick = JSON.parse(data.toString('utf-8'))

  tickIth = tickIth++ < TICK_INTERVAL ? tickIth : 1
  if (tickIth !== TICK_INTERVAL) return

  logWriter.write(`${printNow()}\n`)

  //
  asset = await getAsset()
  console.log('👀 - asset', asset)

  //   if (buyingCondition) {
  //     const buyingOrderResult = await orderCoin({
  //       market: COIN_CODE,
  //       ord_type: 'price',
  //       // ord_type: 'limit',
  //       price: String(BUYING_AMOUNT_UNIT),
  //       // price: 'tick.tp',
  //       side: 'bid',
  //       // volume: tick.tp / BUYING_AMOUNT_UNIT,
  //     })

  //     if (buyingOrderResult.error) {
  //       logWriter.write(`${printNow()} bid err ${JSON.stringify(buyingOrderResult)}\n`)
  //     } else {
  //       const buyingOrderDetail = await waitUntilOrderDone(buyingOrderResult.uuid)

  //       const averageBuyingPrice =
  //         buyingOrderDetail.trades.reduce((acc, current) => acc + +current.funds, 0) /
  //         +buyingOrderDetail.executed_volume

  //       logWriter.write(`${printNow()} bid res ${JSON.stringify(buyingOrderDetail)}\n`) // res = result

  //       const sellingOption = {
  //         market: COIN_CODE,
  //         ord_type: 'limit' as const,
  //         price: `${ceilUpbitPrice(averageBuyingPrice * AUTO_SELLING_RATIO)}`,
  //         side: 'ask' as const,
  //         volume: buyingOrderDetail.executed_volume,
  //       }

  //       while (true) {
  //         const sellingOrderResult = await orderCoin(sellingOption)

  //         if (sellingOrderResult.error) {
  //           logWriter.write(
  //             `${printNow()} ask err ${JSON.stringify(sellingOrderResult)} ${JSON.stringify(
  //               sellingOption
  //             )}\n`
  //           )
  //         } else {
  //           logWriter.write(`${printNow()} ask res ${JSON.stringify(sellingOrderResult)}\n`) // res = result
  //           break
  //         }
  //       }
  //     }
  //   }
})

async function waitUntilOrderDone(uuid: string) {
  while (true) {
    const buyingOrder = await getOrder(uuid)
    const state = buyingOrder.state

    if (state === 'done' || state === 'cancel') return buyingOrder
  }
}
