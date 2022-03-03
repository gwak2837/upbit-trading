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
} from './utils/options'
import { getAssets, getMoneyRatio, getOrder, orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

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
  logWriter.end()
  exit()
})

ws.on('message', async (data) => {
  if (isTrading) return

  tickIth = tickIth++ < TICK_INTERVAL ? tickIth : 1
  if (tickIth !== TICK_INTERVAL) return

  logWriter.write(`${printNow()}\n`)

  const tick = JSON.parse(data.toString('utf-8'))
  const currentMoneyRatio = getMoneyRatio(assets, tick.tp)

  // 코인 판매
  if (currentMoneyRatio < MIN_MONEY_RATIO) {
    isTrading = true

    const sellingResult = await orderCoin({
      market: COIN_CODE,
      side: 'ask',
      volume: `${Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / tick.tp) / 100_000_000}`,
      ord_type: 'market',
    })
    await waitUntilOrderExecuted(sellingResult.uuid)

    assets = await getAssets()

    isTrading = false
  }

  // 코인 구매
  else if (currentMoneyRatio > MAX_MONEY_RATIO) {
    isTrading = true

    const buyingResult = await orderCoin({
      market: COIN_CODE,
      side: 'bid',
      price: '5000',
      ord_type: 'price',
    })
    await waitUntilOrderExecuted(buyingResult.uuid)

    assets = await getAssets()

    isTrading = false
  }
})

async function waitUntilOrderExecuted(uuid: string) {
  while (true) {
    const { state } = await getOrder(uuid)
    if (state === 'done' || state === 'cancel') return
  }
}
