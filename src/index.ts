import WebSocket from 'ws'

import { arrayMax, arrayMin, arraySumation, printNow, sleep } from './utils/common'
import { cci, mfi, rsi, willliamsR } from './utils/indicator'
import {
  AUTO_SELLING_RATIO,
  TICK_INTERVAL,
  goodToBuy,
  upbitWebSocketRequestOption,
} from './utils/options'
import { ceilUpbitPrice, getOrder, order as orderCoin } from './utils/upbit'
import { buyingIndicatorWriter, logWriter, tickWriter } from './utils/writer'

let tickIth = 1
const tempTicks = new Array()
const tempVolumes = new Array()

let prevIndicator = {
  rsi: 50,
  mfi: 50,
  cci: 0,
  willliamsR: -50,
}

let buy = true

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
      mfi: mfi.nextValue(newTick) ?? 50,
      cci: Math.round((cci.nextValue(newTick) ?? 0) * 100) / 100,
      willliamsR: Math.round((willliamsR.nextValue(newTick as any) ?? -50) * 100) / 100,
    }

    if (goodToBuy(prevIndicator, newIndicator)) {
      const buyingOrderResult = await orderCoin({
        market: tick.cd,
        ord_type: 'price', // limit로 개선 필요
        price: '6000',
        // price: '50000000',
        side: 'bid',
        // volume: '0.0002',
      })

      logWriter.write(`${printNow()} bid ${JSON.stringify(buyingOrderResult)}\n`)
      buyingIndicatorWriter.write(`${printNow()} ${Object.values(newIndicator).join(',')}\n`)

      if (!buyingOrderResult.error) {
        const { trades } = await waitUntilOrderDone(buyingOrderResult.uuid)

        trades.forEach(async (trade) => {
          const sellingOrderResult = await orderCoin({
            market: trade.market,
            ord_type: 'limit',
            price: `${ceilUpbitPrice(+trade.price * AUTO_SELLING_RATIO)}`,
            side: 'ask',
            volume: trade.volume,
          })

          logWriter.write(`${printNow()} ask ${JSON.stringify(sellingOrderResult)}\n`)
        })
      }
    }

    tempTicks.length = 0
    tempVolumes.length = 0
    prevIndicator = newIndicator

    tickWriter.write(
      [
        newTick.open,
        newTick.high,
        newTick.low,
        newTick.close,
        newTick.volume,
        newIndicator.rsi,
        newIndicator.mfi,
        newIndicator.cci,
        newIndicator.willliamsR,
      ].join(',') + '\n'
    )
  }

  tickIth = ++tickIth <= TICK_INTERVAL ? tickIth : 1
})

async function waitUntilOrderDone(uuid: string) {
  while (true) {
    const buyingOrder = await getOrder(uuid)

    if (buyingOrder.state === 'done' || buyingOrder.state === 'cancel') return buyingOrder
  }
}

// async function buyAndSell() {
//   const marketOrderBody = {
//     market: 'KRW-BTC',
//     ord_type: 'price',
//     side: 'bid',
//     price: '6000',
//   }

//   const body = await order(marketOrderBody)

//   const { trades } = await getOrder(body.uuid)

//   // order 미체결 상태인지 확인하기

//   trades.forEach(async (trade) => {
//     const response = await order({
//       market: trade.market,
//       ord_type: 'limit',
//       side: 'ask',
//       price: `${ceilUpbitPrice(+trade.price * 1.002)}`,
//       volume: trade.volume,
//     })
//     logWriter.write(JSON.stringify(response))
//   })
// }
