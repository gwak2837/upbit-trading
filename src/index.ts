import { UpbitCandle } from './types/upbit'
import { printNow, sleep } from './utils'
import { MARKET_CODES, REBALANCING_INTERVALS, REBALANCING_RATIOS } from './utils/constants'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

const marketCodes = MARKET_CODES.split(',')
const targetRatios = REBALANCING_RATIOS.split(',').map((ratio) => +ratio)
const rebalancingIntervals = REBALANCING_INTERVALS.split(',').map((interval) =>
  process.env.NODE_ENV === 'production' ? +interval : 5000
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
  await Promise.all(waitingOrders.flat().map((order) => cancelOrder(order.uuid)))

  // 자산 평가금액 계산
  const currCandles = result.slice(2) as (UpbitCandle[] | null)[]

  const currPrices: number[] = []
  const currVolumes: number[] = []
  const currEvals: number[] = []

  for (let i = 0; i < coinCount; i++) {
    const candle = currCandles[i]
    if (!candle) return

    const coinPrice = candle[0].trade_price
    currPrices.push(coinPrice)

    const coin = currAssets.find((asset) => asset.currency === coinCodes[i])

    if (coin) {
      const coinBalance = +coin.balance
      currVolumes.push(coinBalance)
      currEvals.push(coinBalance * coinPrice)
    } else {
      currVolumes.push(0)
      currEvals.push(0)
    }
  }

  const cash = currAssets.find((asset) => asset.currency === 'KRW')
  currPrices.push(1)
  currVolumes.push(+cash!.balance)
  currEvals.push(+cash!.balance)

  const totalCurrEval = currEvals.reduce((acc, cur) => acc + cur, 0)

  // 리밸런싱 금액 계산
  const i = marketCodes.findIndex((marketCode) => marketCode === market)
  if (i === -1) return

  const currPrice = currPrices[i]
  const currEval = currEvals[i]
  const currRatio = (100 * currEval) / totalCurrEval

  const targetRatio = targetRatios[i]
  const targetEval = (totalCurrEval * targetRatio) / totalTargetRatio

  const rebalDiffEval = targetEval - currEval
  const rebalDiffRatio = targetRatio - currRatio

  if (Math.abs(rebalDiffEval) < 5050 || Math.abs(rebalDiffRatio) < 0.1) return

  // 리밸런싱 주문
  const orderVolume = rebalDiffEval / currPrice

  if (process.env.NODE_ENV === 'production') {
    await orderCoin({
      market,
      ord_type: 'limit',
      side: orderVolume > 0 ? 'bid' : 'ask',
      price: String(currPrice),
      volume: Math.abs(orderVolume).toFixed(8),
    })
  } else {
    console.log(
      '👀 - order',
      market,
      orderVolume > 0 ? 'bid' : 'ask',
      String(currPrice),
      Math.abs(orderVolume).toFixed(8),
      rebalDiffEval
    )
  }
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
