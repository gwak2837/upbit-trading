import { UpbitCandle } from './types/upbit'
import { printNow, sleep } from './utils'
import {
  MARKET_CODES,
  MAXIMUM_CONCURRENT_REQUEST,
  MINIMUM_REBALANCING_AMOUNT,
  MINIMUM_REBALANCING_RATIO,
  REBALANCING_INTERVALS,
  REBALANCING_RATIOS,
} from './utils/constants'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

const marketCodes = MARKET_CODES.split(',')
const targetRatios = REBALANCING_RATIOS.split(',').map((ratio) => +ratio)
const rebalancingIntervals = REBALANCING_INTERVALS.split(',').map((interval) =>
  process.env.NODE_ENV === 'production'
    ? +interval
    : Math.ceil((marketCodes.length * marketCodes.length) / MAXIMUM_CONCURRENT_REQUEST) * 1000
)

if (marketCodes.length !== rebalancingIntervals.length)
  throw Error('MARKET_CODES, REBALANCING_INTERVALS 배열 길이가 다릅니다')

const coinCodes = marketCodes.map((market) => market.split('-')[1])
const coinCount = marketCodes.length
const totalTargetRatio = targetRatios.reduce((acc, cur) => acc + cur, 0)

async function rebalanceAsset(market: string) {
  // 정보 불러오기
  const result = await Promise.all([
    getOrders({ market }),
    getAssets(),
    ...marketCodes.map((market) => getMinuteCandles(1, { market })),
  ])

  const waitingOrders = result[0]
  if (!waitingOrders) return

  const currAssets = result[1]
  if (!currAssets) return

  // 미체결 주문 모두 취소
  const i = marketCodes.findIndex((marketCode) => marketCode === market)
  if (i === -1) return

  const coinCode = coinCodes[i]

  if (waitingOrders.length !== 0) {
    await Promise.all(waitingOrders.map((order) => cancelOrder(order.uuid)))

    const newInterval = Math.floor(rebalancingIntervals[i] * 1.2)
    rebalancingIntervals[i] = newInterval

    logWriter.write(`${printNow()}, ${coinCode} 주문 취소, 주기: ${newInterval}\n`)
  } else {
    if (rebalancingIntervals[i] > 60_000) {
      rebalancingIntervals[i] = Math.floor(rebalancingIntervals[i] * 0.99)
    }
  }

  // 자산 평가금액 계산
  const currCandles = result.slice(2) as (UpbitCandle[] | null)[]
  const currPrices: number[] = []
  const currEvals: number[] = []

  for (let i = 0; i < coinCount; i++) {
    const candle = currCandles[i]
    if (!candle) return

    const coinPrice = candle[0].trade_price
    currPrices.push(coinPrice)

    const coin = currAssets.find((asset) => asset.currency === coinCodes[i])

    if (coin) {
      const a = coin.balance.split('.')
      currEvals.push(((+a[0] * 100_000_000 + +a[1].padEnd(8, '0')) * coinPrice) / 100_000_000)
    } else {
      currEvals.push(0)
    }
  }

  const cash = currAssets.find((asset) => asset.currency === 'KRW')
  if (!cash) return

  currPrices.push(1)
  currEvals.push(+cash.balance)

  const totalCurrEval = currEvals.reduce((acc, cur) => acc + cur, 0)

  // 리밸런싱 금액 계산
  const currPrice = currPrices[i]
  const currEval = currEvals[i]
  const currRatio = (100 * currEval) / totalCurrEval

  const targetRatio = targetRatios[i]
  const targetEval = (totalCurrEval * targetRatio) / totalTargetRatio

  const rebalDiffEval = targetEval - currEval
  const rebalDiffRatio = targetRatio - currRatio

  if (process.env.NODE_ENV !== 'production') {
    console.table({
      [coinCode]: {
        currPrice,
        currEval: Math.floor(currEval),
        currRatio: currRatio.toFixed(3),
        targetEval: Math.floor(targetEval),
        targetRatio: targetRatio.toFixed(3),
        rebalDiffEval: Math.floor(rebalDiffEval),
        rebalDiffRatio: rebalDiffRatio.toFixed(3),
      },
    })
  }

  if (
    Math.abs(rebalDiffEval) < +MINIMUM_REBALANCING_AMOUNT ||
    Math.abs(rebalDiffRatio) < +MINIMUM_REBALANCING_RATIO
  )
    return

  // 리밸런싱 주문
  const orderVolume = rebalDiffEval / currPrice

  await orderCoin({
    market,
    ord_type: 'limit',
    side: orderVolume > 0 ? 'bid' : 'ask',
    price: String(currPrice),
    volume: Math.abs(orderVolume).toFixed(8),
  })
}

async function rebalancePeriodically(market: string, period: number) {
  while (true) {
    try {
      await rebalanceAsset(market)
    } catch (error) {
      logWriter.write(`${printNow()}, ${JSON.stringify(error)}\n`)
    }
    await sleep(period)
  }
}

for (let i = 0; i < marketCodes.length; i++) {
  rebalancePeriodically(marketCodes[i], rebalancingIntervals[i])
}
