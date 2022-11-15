import { exit } from 'process'

import { v4 } from 'uuid'
import WebSocket from 'ws'

import { Asset, UpbitCandle } from './types/upbit'
import { printNow } from './utils'
import {
  COIN_CODE,
  DEPOSIT_BASE_UNIT,
  MAX_MONEY_RATIO,
  MIN_MONEY_RATIO,
  ORDER_PRICE_UNIT,
  SELLING_VOLUME,
  TICK_INTERVAL,
} from './utils/config'
import {
  cancelOrder,
  depositWon,
  getAssets,
  getMoneyRatio,
  getMonthCandle,
  getOrders,
  orderCoin,
} from './utils/upbit'
import { TEN_MINUTES, logWriter, tickWriter } from './utils/writer'

let tickIth = 0
let isTrading = false
let isUpdatingMonthlyMinimum = false

let monthlyMinimumPrice = 0
let assets: Asset[]
getAssets().then((newAssets) => (assets = newAssets))

const ws = new WebSocket('wss://api.upbit.com/websocket/v1')

ws.on('open', () => {
  logWriter.write(`${printNow()}, websocket is opened`)

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
  logWriter.write(`${printNow()}, websocket is closed`)
  tickWriter.end()
  logWriter.end()
  exit()
})

ws.on('message', async (data) => {
  if (isTrading) return

  // 매 TICK_INTERVAL 주기마다 실행
  tickIth = tickIth++ < TICK_INTERVAL ? tickIth : 1
  if (tickIth !== TICK_INTERVAL) return

  const tick = JSON.parse(data.toString('utf-8'))

  try {
    const currentMoneyRatio = getMoneyRatio(assets, tick.tp)

    isTrading = true

    // 코인 구매
    if (currentMoneyRatio > MAX_MONEY_RATIO) {
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
      }
    }

    // 코인 판매
    else if (currentMoneyRatio < MIN_MONEY_RATIO) {
      const sellingVolume = `${
        Math.ceil((SELLING_VOLUME * 100_000_000) / tick.tp) / 100_000_000
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
      }
    }

    // 원화 입금 후 월 최저가격 갱신
    if (monthlyMinimumPrice > tick.tp) {
      depositWon(DEPOSIT_BASE_UNIT)

      if (!isUpdatingMonthlyMinimum) {
        isUpdatingMonthlyMinimum = true

        getMonthCandle()
          .then((month: UpbitCandle[]) => (monthlyMinimumPrice = month[0].low_price))
          .catch((error) => logWriter.write(`${printNow()}, ${JSON.stringify(error)}`))

        isUpdatingMonthlyMinimum = false
      }
    }

    // 자산 업데이트
    assets = await getAssets()

    isTrading = false

    tickWriter.write(`${printNow()}, ${tick.tp}, ${Math.ceil(currentMoneyRatio * 1000) / 1000}\n`)
  } catch (error) {
    logWriter.write(`${printNow()}, ${JSON.stringify(error)}`)
  }
})

setInterval(async () => {
  try {
    const orders = await getOrders({
      market: COIN_CODE,
      limit: 10,
    })
    for (const order of orders) {
      cancelOrder(order.uuid)
    }
  } catch (error) {
    logWriter.write(`${printNow()}, ${JSON.stringify(error)}`)
  }
}, TEN_MINUTES)

// setInterval(() => {
//   if (!isUpdatingMonthlyMinimum) {
//     isUpdatingMonthlyMinimum = true

//     getMonthCandle()
//       .then((month: UpbitCandle[]) => (monthlyMinimumPrice = month[0].low_price))
//       .catch((error) => logWriter.write(`${printNow()}, ${JSON.stringify(error)}`))

//     isUpdatingMonthlyMinimum = false
//   }
// }, TEN_MINUTES)
