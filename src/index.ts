import { exit } from 'process'

import { v4 } from 'uuid'
import WebSocket from 'ws'

import { Asset } from './types/upbit'
import { printNow } from './utils'
import {
  COIN_CODE,
  MAX_MONEY_RATIO,
  MIN_MONEY_RATIO,
  ORDER_PRICE_UNIT,
  TICK_INTERVAL,
} from './utils/config'
import {
  cancelOrder,
  getAssets,
  getMoneyRatio,
  getOrder,
  getOrders,
  orderCoin,
} from './utils/upbit'
import { TEN_MINUTES, logWriter, tickWriter } from './utils/writer'

let tickIth = 0
let isTrading = false

let assets: Asset[]
getAssets().then((newAssets) => (assets = newAssets))

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
  tickWriter.end()
  logWriter.end()
  exit()
})

ws.on('message', async (data) => {
  if (isTrading) return

  tickIth = tickIth++ < TICK_INTERVAL ? tickIth : 1
  if (tickIth !== TICK_INTERVAL) return

  const tick = JSON.parse(data.toString('utf-8'))
  const currentMoneyRatio = getMoneyRatio(assets, tick.tp)

  // 코인 구매
  if (currentMoneyRatio > MAX_MONEY_RATIO) {
    isTrading = true

    const buyingVolume = `${
      Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / tick.tp) / 100_000_000
    }`.padEnd(10, '0')

    const buyingResult = await orderCoin({
      market: COIN_CODE,
      side: 'bid',
      volume: buyingVolume,
      price: `${tick.tp}`,
      ord_type: 'limit',
    })

    if (buyingResult.error) {
      return logWriter.write(`${printNow()} bid error ${JSON.stringify(buyingResult.error)}\n`)
    } else {
      logWriter.write(`${printNow()} bid success ${JSON.stringify(buyingResult)}\n`)
    }

    assets = await getAssets()

    isTrading = false
  }

  // 코인 판매
  else if (currentMoneyRatio < MIN_MONEY_RATIO) {
    isTrading = true

    const sellingVolume = `${
      Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / tick.tp) / 100_000_000
    }`.padEnd(10, '0')

    const sellingResult = await orderCoin({
      market: COIN_CODE,
      side: 'ask',
      volume: sellingVolume,
      price: `${tick.tp}`,
      ord_type: 'limit',
    })

    if (sellingResult.error) {
      return logWriter.write(`${printNow()} ask error ${JSON.stringify(sellingResult.error)}\n`)
    } else {
      logWriter.write(`${printNow()} ask success ${JSON.stringify(sellingResult)}\n`)
    }

    assets = await getAssets()

    isTrading = false
  }

  // 자산 업데이트
  else {
    isTrading = true

    assets = await getAssets()

    isTrading = false
  }

  tickWriter.write(`${printNow()}, ${tick.tp}, ${Math.ceil(currentMoneyRatio * 1000) / 1000}\n`)
})

setInterval(async () => {
  const orders = await getOrders({
    market: COIN_CODE,
    limit: 10,
  })
  for (const order of orders) {
    cancelOrder(order.uuid)
  }
}, TEN_MINUTES)
