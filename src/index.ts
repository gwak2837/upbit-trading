import WebSocket from 'ws'

import { cci, mfi, rsi, willliamsR } from './lib/indicator'
import { ceilUpbitPrice, getOrder, order as orderCoin } from './lib/upbit'
import { arrayMax, arrayMin, arraySumation, printNow, sleep } from './utils'
import {
  AUTO_SELLING_RATIO,
  TICK_INTERVAL,
  goodToBuy,
  upbitWebSocketRequestOption,
} from './utils/options'
import { logWriter, tickWriter } from './utils/writer'

let tickIth = 0
const tempTicks = new Array()
const tempVolumes = new Array()

let prevIndicator = {
  rsi: 50,
  mfi: 50,
  cci: 0,
  willliamsR: -50,
}

const ws = new WebSocket('wss://api.upbit.com/websocket/v1')

ws.on('open', () => {
  console.log(`${printNow()} websocket open`)
  ws.send(JSON.stringify(upbitWebSocketRequestOption))
}).on('close', () => {
  console.log(`${printNow()} websocket closed`)
  tickWriter.end()
  logWriter.end()
})

ws.on('message', async (data) => {
  const tick = JSON.parse(data.toString('utf-8'))

  tempTicks.push(tick.tp)
  tempVolumes.push(tick.tv)

  tickIth = tickIth++ < TICK_INTERVAL ? tickIth : 1

  if (tickIth === TICK_INTERVAL) {
    const newTick = {
      open: tempTicks[0],
      high: arrayMax(tempTicks),
      low: arrayMin(tempTicks),
      close: tick.tp,
      volume: Math.round(arraySumation(tempVolumes) * 1000) / 1000,
    }

    const newIndicator = {
      rsi: rsi.nextValue(tick.tp) ?? 50,
      cci: Math.round((cci.nextValue(newTick) ?? 0) * 100) / 100,
      mfi: mfi.nextValue(newTick) ?? 50,
      willliamsR: Math.round((willliamsR.nextValue(newTick as any) ?? -50) * 100) / 100,
    }

    const buyingCondition = goodToBuy(prevIndicator, newIndicator)

    prevIndicator = newIndicator
    tempTicks.length = 0
    tempVolumes.length = 0

    if (buyingCondition) {
      const buyingOrderResult = await orderCoin({
        market: tick.cd,
        ord_type: 'price', // limit로 개선 필요
        price: '6000',
        // price: '50000000',
        side: 'bid',
        // volume: '0.0002',
      })

      if (buyingOrderResult.error) {
        logWriter.write(`${printNow()} buy error ${JSON.stringify(buyingOrderResult)}\n`)
      } else {
        const buyingOrderDetail = await waitUntilOrderDone(buyingOrderResult.uuid)

        const averageBuyingPrice =
          buyingOrderDetail.trades.reduce((acc, current) => acc + +current.funds, 0) /
          +buyingOrderDetail.executed_volume

        logWriter.write(`${printNow()} buy detail ${JSON.stringify(buyingOrderDetail)}\n`)

        const sellingOption = {
          market: buyingOrderDetail.market,
          ord_type: 'limit' as const,
          price: `${ceilUpbitPrice(averageBuyingPrice * AUTO_SELLING_RATIO)}`,
          side: 'ask' as const,
          volume: buyingOrderDetail.executed_volume,
        }

        while (true) {
          const sellingOrderResult = await orderCoin(sellingOption)

          logWriter.write(`${printNow()} sell result ${JSON.stringify(sellingOrderResult)}\n`)

          if (sellingOrderResult.error) {
            logWriter.write(`${printNow()} sell error ${JSON.stringify(sellingOption)}\n`)
          } else {
            break
          }
        }
      }
    }

    const tickLog = [printNow(), ...Object.values(newTick), ...Object.values(newIndicator)]
    if (buyingCondition) tickLog.push('O')
    tickWriter.write(tickLog.join(',') + '\n')
  }
})

async function waitUntilOrderDone(uuid: string) {
  while (true) {
    const buyingOrder = await getOrder(uuid)
    const state = buyingOrder.state

    if (state === 'done' || state === 'cancel') return buyingOrder
  }
}
