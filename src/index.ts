import {
  MARKET_CODES,
  MINIMUM_REBALANCING_AMOUNT,
  MINIMUM_REBALANCING_RATIO,
  NODE_ENV,
  PGURI,
  REBALANCING_INTERVAL,
  REBALANCING_RATIOS,
  REBALANCING_RATIO_DECREASING_RATE,
  REBALANCING_RATIO_INCREASING_RATE,
} from './common/constants'
import { pool } from './common/postgres'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './common/upbit'
import { addDecimal8, printNow, sleep } from './common/utils'
import { logWriter } from './common/writer'
import createAssetHistories from './createAssetHistories.sql'
import { UpbitCandle, UpbitOrderDetail } from './types/upbit'

const marketCodes = MARKET_CODES.split(',')
const targetRatios = REBALANCING_RATIOS.split(',').map((ratio) => +ratio)
const minimumRebalancingGaps = Array(marketCodes.length).fill(
  +MINIMUM_REBALANCING_RATIO * +REBALANCING_RATIO_INCREASING_RATE
)

if (marketCodes.length !== targetRatios.length)
  throw new Error('MARKET_CODES, REBALANCING_RATIOS 배열 길이가 다릅니다')

const coinCodes = marketCodes.map((market) => market.split('-')[1])
const coinCount = marketCodes.length
const totalTargetRatio = targetRatios.reduce((acc, ratio) => acc + ratio, 0)

let willCreateHistory = true

type CoinStatistics = Record<
  string,
  {
    price: number
    balance: number
    value: number
    ratio: number
    targetValue: number
    targetRatio: number
    balanceDiff: number
    valueDiff?: number
    ratioDiff?: number
  }
>

async function rebalanceAssets() {
  // 정보 불러오기
  const result = await Promise.all([
    getAssets(),
    ...marketCodes.map((market) => getMinuteCandles(1, { market })),
    ...marketCodes.map((market) => getOrders({ market })),
  ])

  const currAssets = result[0]
  if (!currAssets) return

  const currCandles = result.slice(1, coinCount + 1) as UpbitCandle[][]
  if (currCandles.some((candle) => candle === null)) return

  const allAssetsWaitingOrders = result.slice(coinCount + 1) as UpbitOrderDetail[][]
  if (allAssetsWaitingOrders.some((order) => order === null)) return

  // 자산별 평가금액 계산
  const coinStatistics: CoinStatistics = {}

  for (let i = 0; i < coinCount; i++) {
    const coinCode = coinCodes[i]
    const coinPrice = currCandles[i][0].trade_price

    const asset = currAssets.find((asset) => asset.currency === coinCode)
    if (!asset) {
      coinStatistics[coinCode] = {
        price: coinPrice,
        balance: 0,
        value: 0,
        ratio: 0,
        targetValue: 0,
        targetRatio: targetRatios[i],
        balanceDiff: 0,
      }
      continue
    }

    const _ = asset.balance.split('.')

    coinStatistics[coinCode] = {
      price: coinPrice,
      balance: addDecimal8(asset.balance, asset.locked),
      value: ((+_[0] * 100_000_000 + +(_[1]?.padEnd(8, '0') ?? 0)) * coinPrice) / 100_000_000,
      ratio: 0,
      targetValue: 0,
      targetRatio: targetRatios[i],
      balanceDiff: 0,
    }
  }

  const cash = currAssets.find((asset) => asset.currency === 'KRW')
  if (!cash) return

  const cashBalance = addDecimal8(cash.balance, cash.locked)

  coinStatistics.KRW = {
    price: 1,
    balance: cashBalance,
    value: cashBalance,
    ratio: 0,
    targetValue: 0,
    targetRatio: 100 - totalTargetRatio,
    balanceDiff: 0,
  }

  const totalCurrValue = Object.values(coinStatistics).reduce((acc, { value }) => acc + value, 0)

  const KRW = coinStatistics.KRW
  KRW.targetValue = (totalCurrValue * (100 - totalTargetRatio)) / 100
  KRW.ratio = (100 * KRW.value) / totalCurrValue
  KRW.valueDiff = KRW.targetValue - KRW.value
  KRW.balanceDiff = KRW.valueDiff / KRW.price
  KRW.ratioDiff = KRW.targetRatio - KRW.ratio

  revalancing: for (let i = 0; i < coinCount; i++) {
    // 리밸런싱 계산
    const coinCode = coinCodes[i]
    const coinStatistic = coinStatistics[coinCode]

    const price = coinStatistic.price
    const value = coinStatistic.value
    const ratio = (coinStatistic.ratio = (100 * value) / totalCurrValue)

    const targetRatio = coinStatistic.targetRatio
    const targetValue = (coinStatistic.targetValue = (totalCurrValue * targetRatio) / 100)

    const valueDiff = (coinStatistic.valueDiff = targetValue - value)
    const balanceDiff = (coinStatistic.balanceDiff = valueDiff / price)
    const ratioDiff = (coinStatistic.ratioDiff = targetRatio - ratio)

    if (Math.abs(valueDiff) < +MINIMUM_REBALANCING_AMOUNT) continue

    const minimumRebalancingGap = minimumRebalancingGaps[i]

    if (Math.abs(ratioDiff) < minimumRebalancingGap) {
      if (minimumRebalancingGap > +MINIMUM_REBALANCING_RATIO) {
        minimumRebalancingGaps[i] *= +REBALANCING_RATIO_DECREASING_RATE
      } else {
        minimumRebalancingGaps[i] = +MINIMUM_REBALANCING_RATIO
      }
      continue
    }

    const side = balanceDiff > 0 ? 'bid' : 'ask'
    const rawVolume = Math.abs(balanceDiff)
    const volume = rawVolume.toFixed(8)

    if (NODE_ENV !== 'production') {
      console.log('👀 - order', coinCode, side, price, volume)
      continue
    }

    // 현재 자산 대기 주문 유지.삭제
    const canceledOrders = []

    for (const currAssetWaitingOrder of allAssetsWaitingOrders[i]) {
      const prevPrice = +currAssetWaitingOrder.price
      const prevVolume = +currAssetWaitingOrder.volume

      if (
        currAssetWaitingOrder.side === side &&
        prevPrice > price * 0.98 &&
        prevPrice < price * 1.02 &&
        prevVolume > rawVolume * 0.98 &&
        prevVolume < rawVolume * 1.02
      ) {
        await Promise.all(canceledOrders)
        continue revalancing
      }

      canceledOrders.push(cancelOrder(currAssetWaitingOrder.uuid))
    }

    // 다른 자산 대기 주문 유지.삭제
    for (let j = 0; j < allAssetsWaitingOrders.length; j++) {
      if (j === i) continue

      for (const otherAssetWaitingOrder of allAssetsWaitingOrders[j]) {
        canceledOrders.push(cancelOrder(otherAssetWaitingOrder.uuid))
      }
    }

    await Promise.all(canceledOrders)

    // 주문
    await orderCoin({
      market: marketCodes[i],
      ord_type: 'limit',
      side,
      price: String(price),
      volume,
    })

    const coinCode_ = coinCode.padEnd(4, ' ')
    const gap = minimumRebalancingGap.toFixed(5)
    logWriter.write(`${printNow()} ${coinCode_} min_rebalance_gap: ${gap}\n`)
    minimumRebalancingGaps[i] *= +REBALANCING_RATIO_INCREASING_RATE

    // 최소 1시간마다 기록
    if (willCreateHistory) {
      willCreateHistory = false

      const statistics = Object.values(coinStatistics)

      pool
        .query(createAssetHistories, [
          Object.keys(coinStatistics),
          statistics.map((stat) => stat.balance),
          statistics.map((stat) => stat.price),
        ])
        .then(() =>
          setTimeout(() => {
            willCreateHistory = true
          }, 3600_000)
        )
    }
  }

  // 통계 기록
  if (NODE_ENV !== 'production') {
    for (const coinCode in coinStatistics) {
      const coinStatistic = coinStatistics[coinCode]
      coinStatistic.value = Math.floor(coinStatistic.value)
      coinStatistic.ratio = coinStatistic.ratio.toFixed(3) as any
      coinStatistic.targetValue = Math.floor(coinStatistic.targetValue)
      coinStatistic.balanceDiff = coinStatistic.balanceDiff.toFixed(8) as any
      coinStatistic.valueDiff = Math.floor(coinStatistic.valueDiff ?? 0)
      coinStatistic.ratioDiff = (coinStatistic.ratioDiff ?? 0).toFixed(3) as any
    }

    console.log('👀 - candle_date_time_kst', currCandles[0][0].candle_date_time_kst)
    console.table(coinStatistics)
  }
}

async function rebalancePeriodically() {
  while (true) {
    await sleep(+REBALANCING_INTERVAL)

    try {
      await rebalanceAssets()
    } catch (error: any) {
      logWriter.write(`${printNow()} ${JSON.stringify(error.message)}\n`)
    }
  }
}

rebalancePeriodically()

pool
  .query('SELECT CURRENT_TIMESTAMP')
  .then(({ rows }) =>
    console.log(
      `🚅 Connected to ${PGURI} at ${new Date(rows[0].current_timestamp).toLocaleString()}`
    )
  )
  .catch((error) => {
    throw new Error('Cannot connect to PostgreSQL server... \n' + error)
  })
