import WebSocket from 'ws'

import { cci, mfi, rsi, willliamsR } from './lib/indicator'
import { cancelOrder, ceilUpbitPrice, getOrder, getOrders, order as orderCoin } from './lib/upbit'
import { UpbitOrder } from './types/upbit'
import { arrayMax, arrayMin, sumArray, printNow } from './utils'
import {
  AUTO_SELLING_RATIO,
  TICK_INTERVAL,
  goodToBuy,
  upbitWebSocketRequestOption,
  COIN_CODE,
  BUYING_ORDERS_MERGING_INTERVAL,
  BUYING_ORDERS_MERGING_MAX_COUNT,
  COIN_UNIT,
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

  if (tickIth !== TICK_INTERVAL) return

  const newTick = {
    open: tempTicks[0],
    high: arrayMax(tempTicks),
    low: arrayMin(tempTicks),
    close: tick.tp,
    volume: Math.round(sumArray(tempVolumes) * 1000) / 1000,
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
      market: COIN_CODE,
      ord_type: 'price',
      // ord_type: 'limit',
      price: '6000',
      // price: 'tick.tp',
      side: 'bid',
      // volume: tick.tp / BUYING_AMOUNT_UNIT,
    })

    if (buyingOrderResult.error) {
      logWriter.write(`${printNow()} bid err ${JSON.stringify(buyingOrderResult)}\n`)
    } else {
      const buyingOrderDetail = await waitUntilOrderDone(buyingOrderResult.uuid)

      const averageBuyingPrice =
        buyingOrderDetail.trades.reduce((acc, current) => acc + +current.funds, 0) /
        +buyingOrderDetail.executed_volume

      logWriter.write(`${printNow()} bid res ${JSON.stringify(buyingOrderDetail)}\n`) // res = result

      const sellingOption = {
        market: COIN_CODE,
        ord_type: 'limit' as const,
        price: `${ceilUpbitPrice(averageBuyingPrice * AUTO_SELLING_RATIO)}`,
        side: 'ask' as const,
        volume: buyingOrderDetail.executed_volume,
      }

      while (true) {
        const sellingOrderResult = await orderCoin(sellingOption)

        if (sellingOrderResult.error) {
          logWriter.write(
            `${printNow()} ask err ${JSON.stringify(sellingOrderResult)} ${JSON.stringify(
              sellingOption
            )}\n`
          )
        } else {
          logWriter.write(`${printNow()} ask res ${JSON.stringify(sellingOrderResult)}\n`) // res = result
          break
        }
      }
    }
  }

  const tickLog = [printNow(), ...Object.values(newTick), ...Object.values(newIndicator)]
  if (buyingCondition) tickLog.push('O')
  tickWriter.write(tickLog.join(',') + '\n')
})

async function waitUntilOrderDone(uuid: string) {
  while (true) {
    const buyingOrder = await getOrder(uuid)
    const state = buyingOrder.state

    if (state === 'done' || state === 'cancel') return buyingOrder
  }
}

setInterval(() => {
  mergeBuyingOrders()
}, BUYING_ORDERS_MERGING_INTERVAL)

async function mergeBuyingOrders() {
  const orders = await getOrders({
    market: COIN_CODE,
    order_by: 'asc',
  })

  if (orders.length < 2) return

  const askOrders = orders
    .filter((order) => order.side === 'ask')
    .sort((order, order2) => +order2.price - +order.price)
    .slice(0, BUYING_ORDERS_MERGING_MAX_COUNT)
  const canceledAskOrders: UpbitOrder[] = []

  if (askOrders.length < 2) return

  for (const order of askOrders) {
    const canceledAskOrder = await cancelOrder(order.uuid)
    if (!canceledAskOrder.error) canceledAskOrders.push(canceledAskOrder)
  }

  if (canceledAskOrders.length === 0) return

  const zeroPadding = '0'.repeat(COIN_UNIT)

  let priceVolumeSum = 0,
    volumeIntSum = 0,
    volumeDecimalSum = 0
  for (const order of canceledAskOrders) {
    const [int, decimal] = order.remaining_volume.split('.')
    priceVolumeSum += +order.price * +order.remaining_volume
    volumeIntSum += +int
    volumeDecimalSum += +(decimal + zeroPadding).slice(0, COIN_UNIT)
  }

  const volumeSum = `${volumeIntSum + Number(String(volumeDecimalSum).slice(0, -COIN_UNIT))}.${(
    String(volumeDecimalSum).slice(-COIN_UNIT) + zeroPadding
  ).slice(0, COIN_UNIT)}`

  const averageSellingPrice = priceVolumeSum / +volumeSum

  const sellingOption = {
    market: COIN_CODE,
    ord_type: 'limit' as const,
    price: `${ceilUpbitPrice(averageSellingPrice)}`,
    side: 'ask' as const,
    volume: volumeSum,
  }

  while (true) {
    const sellingOrderResult = await orderCoin(sellingOption)

    if (sellingOrderResult.error) {
      logWriter.write(
        `${printNow()} re-ask err ${JSON.stringify(sellingOrderResult)} ${JSON.stringify(
          sellingOption
        )}\n`
      )
    } else {
      logWriter.write(`${printNow()} re-ask res ${JSON.stringify(sellingOrderResult)}\n`) // res = result
      break
    }
  }
}
