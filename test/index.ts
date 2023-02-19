/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { UpbitCandle, UpbitError } from '../src/types/upbit'
import { COIN_CODE, ORDER_PRICE_UNIT } from '../src/utils/config'
import {
  cancelOrder,
  depositWon,
  getAssets,
  getDepositHistory,
  getMinuteCandles,
  getMonthCandle,
  getOrder,
  getOrders,
  orderCoin,
} from '../src/utils/upbit'

// getAssets().then((asset) => console.log('👀 - asset', asset))

// getOrder('a1f53b38-2f19-49bd-b908-8b8dfc8545b2').then((order) =>
//   console.log('👀 - getOrder', order)
// )

// getMonthCandle().then((result) => console.log('👀 - getMonthCandle', result))

// getDepositHistory().then((result) => console.log('👀 - getDepositHistory', result))

// depositWon(5000).then((result) => console.log('👀 - depositWon', result))

// 리밸런싱 단위 5000원 이상 또는 0.1 이상
const targetRatios = [20, 20, 20, 20, 20]
const marketCodes = ['KRW-BTC', 'KRW-XRP', 'KRW-DOGE', 'KRW-TRX']

const totalTargetRatio = targetRatios.reduce((acc, cur) => acc + cur, 0)
const coinCodes = marketCodes.map((market) => market.split('-')[1])
const assetCodes = [...coinCodes, 'KRW']
const candles = marketCodes.map((market) => getMinuteCandles(1, { market }))
const currRatios: number[] = []
const currEvals: number[] = []
const currVolumes: number[] = []
const currPrices: number[] = []
const targetEvals: number[] = []
const rebalDiffEvals: number[] = []
const rebalDiffRatios: number[] = []
const orderVolumes: string[] = []
const orderSides: string[] = []

Promise.all([getAssets(), ...candles]).then((result) => {
  const currAssets = result[0]

  // 코인 평가금액 계산
  for (let i = 1; i < result.length; i++) {
    const candle = result[i] as UpbitCandle[] & UpbitError
    if (candle.error) {
      console.log('👀 - candle.error', candle.error)
      break
    }

    const coinPrice = candle[0].trade_price
    currPrices.push(coinPrice)

    const coin = currAssets.find((asset) => asset.currency === coinCodes[i - 1])
    if (!coin) {
      currVolumes.push(0)
      currEvals.push(0)
      continue
    }

    const coinBalance = +coin.balance
    currVolumes.push(coinBalance)
    currEvals.push(coinBalance * coinPrice)
  }

  // 원화 잔액 계산
  const cash = currAssets.find((asset) => asset.currency === 'KRW')
  currPrices.push(1)
  currVolumes.push(+cash!.balance)
  currEvals.push(+cash!.balance)

  const totalCurrEval = currEvals.reduce((acc, cur) => acc + cur, 0)

  // 리밸런싱 금액 계산
  for (let i = 0; i < targetRatios.length; i++) {
    const currPrice = currPrices[i]
    const currEval = currEvals[i]
    const targetRatio = targetRatios[i]

    const currRatio = (100 * currEval) / totalCurrEval
    currRatios.push(currRatio)

    const targetEval = (totalCurrEval * targetRatio) / totalTargetRatio
    targetEvals.push(targetEval)

    const rebalDiffEval = targetEval - currEval // 5005원 이상
    rebalDiffEvals.push(rebalDiffEval)

    rebalDiffRatios.push(Math.abs(currRatio - targetRatio)) //

    if (i === targetRatios.length - 1) continue

    const orderVolume = rebalDiffEval / currPrice
    orderVolumes.push(Math.abs(orderVolume).toFixed(8))
    orderSides.push(orderVolume > 0 ? 'ask' : 'bid')
  }

  // 결과
  const table = {
    currPrice: new Table(currPrices),
    currVolume: new Table(currVolumes),
    currEval: new Table(currEvals.map((currEval) => Math.floor(currEval))),
    currRatio: new Table(currRatios.map((currRatio) => +currRatio.toFixed(2))),
    '': [],
    targetEval: new Table(targetEvals.map((targetEval) => Math.floor(targetEval))),
    targetRatio: new Table(targetRatios),
    ' ': [],
    rebalDiffEval: new Table(rebalDiffEvals.map((rebalDiffEval) => Math.floor(rebalDiffEval))),
    rebalDiffRatio: new Table(rebalDiffRatios.map((rebalDiffRatio) => +rebalDiffRatio.toFixed(2))),
    '  ': [],
    orderSide: new Table(orderSides),
    orderVolume: new Table(orderVolumes),
  }
  console.table(table, assetCodes)
})

function Table(arr: (number | string)[]) {
  for (let i = 0; i < assetCodes.length; i++) {
    const element = arr[i]
    this[assetCodes[i]] = element
  }
}

// -는 위로 +는 아래로
