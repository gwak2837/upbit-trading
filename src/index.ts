import WebSocket from 'ws'

import { arrayMax, arrayMin, arraySumation } from './utils/common'
import { cci, mfi, rsi, willliamsR } from './utils/indicator'
import { TICK_INTERVAL, upbitWebSocketRequestOption } from './utils/options'
import { ceilUpbitPrice, getOrder, order } from './utils/upbit'
import { logWriter, tickWriter } from './utils/writer'

type Tick = {
  high: number
  low: number
  close: number
  volume: number
}

const results = []

let first = true
let tickIth = 1
const tempTicks = new Array()
const tempVolumes = new Array()
const buy = true

const ws = new WebSocket('wss://api.upbit.com/websocket/v1')

ws.on('open', () => {
  console.log('trade websocket is connected')
  ws.send(JSON.stringify(upbitWebSocketRequestOption))
}).on('close', () => {
  console.log('trade websocket is closed')
  tickWriter.end()
  logWriter.end()
})

ws.on('message', (data) => {
  const tick = JSON.parse(data.toString('utf-8'))

  tempTicks.push(tick.tp)
  tempVolumes.push(tick.tv)

  if (tickIth === TICK_INTERVAL) {
    const newTick = {
      open: tempTicks[0],
      high: arrayMax(tempTicks),
      low: arrayMin(tempTicks),
      close: tick.tp,
      volume: Math.round(arraySumation(tempVolumes) * 1000) / 1000,
    }

    const newResult = {
      tick: newTick,
      mfi: mfi.nextValue(newTick) ?? 0,
      rsi: rsi.nextValue(tick.tp) ?? 0,
      cci: Math.round((cci.nextValue(newTick) ?? 0) * 100) / 100,
      willliamsR: Math.round((willliamsR.nextValue(newTick as any) ?? 0) * 100) / 100,
    }

    results.push(newResult)

    tempTicks.length = 0
    tempVolumes.length = 0

    tickWriter.write(
      [
        newTick.open,
        newTick.high,
        newTick.low,
        newTick.close,
        newTick.volume,
        newResult.mfi,
        newResult.rsi,
        newResult.cci,
        newResult.willliamsR,
      ].join(',') + '\n'
    )
  }

  tickIth = ++tickIth <= TICK_INTERVAL ? tickIth : 1
})

async function buyAndSell() {
  const marketOrderBody = {
    market: 'KRW-BTC',
    ord_type: 'price',
    side: 'bid',
    price: '6000',
  }

  const body = await order(marketOrderBody)

  const { trades } = await getOrder(body.uuid)

  // order 미체결 상태인지 확인하기

  trades.forEach(async (trade) => {
    const response = await order({
      market: trade.market,
      ord_type: 'limit',
      side: 'ask',
      price: `${ceilUpbitPrice(+trade.price * 1.002)}`,
      volume: trade.volume,
    })
    logWriter.write(JSON.stringify(response))
  })
}
