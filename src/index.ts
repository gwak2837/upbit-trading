import { UpbitCandle } from './types/upbit'
import { printNow, sleep } from './utils'
import {
  MARKET_CODES,
  MINIMUM_REBALANCING_AMOUNT,
  MINIMUM_REBALANCING_RATIO,
  REBALANCING_RATIOS,
} from './utils/constants'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

const marketCodes = MARKET_CODES.split(',')
const targetRatios = REBALANCING_RATIOS.split(',').map((ratio) => +ratio)

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

  // 자산 평가금액 계산
  const currCandles = result.slice(2) as (UpbitCandle[] | null)[]
  const currPrices: number[] = []
  const currBalances: string[] = []
  const currEvals: number[] = []

  for (let i = 0; i < coinCount; i++) {
    const candle = currCandles[i]
    if (!candle) return

    const coinPrice = candle[0].trade_price
    currPrices.push(coinPrice)

    const coin = currAssets.find((asset) => asset.currency === coinCodes[i])

    if (coin) {
      const a = coin.balance.split('.')
      currBalances.push(coin.balance)
      currEvals.push(((+a[0] * 100_000_000 + +a[1].padEnd(8, '0')) * coinPrice) / 100_000_000)
    } else {
      currBalances.push('0')
      currEvals.push(0)
    }
  }

  const cash = currAssets.find((asset) => asset.currency === 'KRW')
  if (!cash) return

  currPrices.push(1)
  currEvals.push(+cash.balance)

  const totalCurrEval = currEvals.reduce((acc, cur) => acc + cur, 0)

  // 리밸런싱 금액 계산
  const i = marketCodes.findIndex((marketCode) => marketCode === market)
  if (i === -1) return

  const coinCode = coinCodes[i]

  const currPrice = currPrices[i]
  const currBalance = currBalances[i]
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
        currBalance: currBalance,
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

  // 리밸런싱
  const orderVolume = rebalDiffEval / currPrice
  const orderSide = orderVolume > 0 ? 'bid' : 'ask'

  if (waitingOrders.length !== 0) {
    const canceledOrders = []

    for (const waitingOrder of waitingOrders) {
      const price = +waitingOrder.price
      const volume = +waitingOrder.volume

      if (
        waitingOrder.side === orderSide &&
        price > currPrice * 0.95 &&
        price < currPrice * 1.05 &&
        volume > Math.abs(orderVolume) * 0.95 &&
        volume < Math.abs(orderVolume) * 1.05
      )
        return

      canceledOrders.push(cancelOrder(waitingOrder.uuid))

      const log = `${printNow()}, ${coinCode} 주문 취소, 이전 주문: ${price} ${volume}, 현재 주문: ${currPrice} ${orderVolume}\n`
      logWriter.write(log)
    }

    await Promise.all(canceledOrders)
  }

  await orderCoin({
    market,
    ord_type: 'limit',
    side: orderSide,
    price: String(currPrice),
    volume: Math.abs(orderVolume).toFixed(8),
  })

  // 자산 기록
  // assetsWriter.write(`Date,${currAssets.map((asset) => asset.currency).join(',')}\n`)
  // assetsWriter.write(`${printNow()},${currAssets.map((asset) => asset.balance).join(',')}\n`)
}

async function rebalancePeriodically(market: string) {
  while (true) {
    try {
      await rebalanceAsset(market)
    } catch (error) {
      logWriter.write(`${printNow()}, ${JSON.stringify(error)}\n`)
    }
    await sleep(60_000 + Math.floor(Math.random() * 10_000))
  }
}

for (let i = 0; i < marketCodes.length; i++) {
  rebalancePeriodically(marketCodes[i])
}
