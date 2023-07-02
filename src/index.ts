import {
  MINIMUM_REBALANCING_AMOUNT,
  NODE_ENV,
  PGURI,
  REBALANCING_INTERVAL,
  REBALANCING_RATIO_DECREASING_RATE,
  REBALANCING_RATIO_INCREASING_RATE,
} from './common/constants'
import { pool } from './common/postgres'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './common/upbit'
import { addDecimal8, printNow, sleep } from './common/utils'
import { logWriter } from './common/writer'
import createAssetHistories from './createAssetHistories.sql'
import { UpbitCandle, UpbitOrderDetail } from './types/upbit'

const assetPairs = [
  { coin1: 'KRW-MATIC', coin2: 'KRW-ADA', gap: 2 },
  { coin1: 'KRW-BTC', coin2: 'KRW-XLM', gap: 2 },
  { coin1: 'KRW-REP', coin2: 'KRW-XRP', gap: 2 },
  { coin1: 'KRW-GAS', coin2: 'KRW-AXS', gap: 2 },
  { coin1: 'KRW-NEO', coin2: 'KRW-AAVE', gap: 2 },
  { coin1: 'KRW-AVAX', coin2: 'KRW-MTL', gap: 2 },
] as const

const marketCodes = assetPairs.map((assetPair) => [assetPair.coin1, assetPair.coin2]).flat()
const coinCodes = marketCodes.map((marketCode) => marketCode.split('-')[1])
const coinCount = coinCodes.length

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

  const assets = result[0]
  if (!assets) return

  const rawCandles = result.slice(1, coinCount + 1) as UpbitCandle[][]
  if (rawCandles.some((candle) => candle === null)) return

  const candles = rawCandles.filter((candle) => candle).flat()

  const rawWaitingOrders = result.slice(coinCount + 1) as UpbitOrderDetail[][]
  if (rawWaitingOrders.some((order) => order === null)) return

  const waitingOrders = rawWaitingOrders.filter((order) => order).flat()

  // 자산별 평가금액 계산
  const coinStatistics: Record<string, any> = {}

  for (const marketCode of marketCodes) {
    const coinCode = marketCode.split('-')[1]

    const asset = assets.find((asset) => asset.currency === coinCode)
    if (!asset) return

    const coinPrice = candles.find((candle) => candle.market === marketCode)?.trade_price
    if (!coinPrice) return

    const _ = asset.balance.split('.')

    coinStatistics[coinCode] = {
      price: coinPrice,
      balance: addDecimal8(asset.balance, asset.locked),
      value: ((+_[0] * 100_000_000 + +(_[1]?.padEnd(8, '0') ?? 0)) * coinPrice) / 100_000_000,
    }
  }

  // 리밸런싱 계산
  const coinCodes = Object.keys(coinStatistics)

  for (let i = 0; i < coinCodes.length; i++) {
    const coinCode = coinCodes[i]
    const coinStat = coinStatistics[coinCode]
    const coin2Stat = coinStatistics[coinCodes[i % 2 === 0 ? i + 1 : i - 1]]

    const totalValue = coinStat.value + coin2Stat.value

    coinStat.ratio = (100 * coinStat.value) / totalValue
    coinStat.valueDiff = totalValue / 2 - coinStat.value
    coinStat.ratioDiff = (100 * coinStat.valueDiff) / totalValue
    coinStat.balanceDiff = coinStat.valueDiff / coinStat.price
  }

  // 리밸런싱
  for (let i = 0; i < coinCodes.length; i++) {
    const coinCode = coinCodes[i]
    const { price, balance, value, ratio, balanceDiff, valueDiff, ratioDiff } =
      coinStatistics[coinCode]
    const assetPair = assetPairs[Math.floor(i / 2)]

    if (Math.abs(valueDiff) < +MINIMUM_REBALANCING_AMOUNT) {
      i++
      continue
    }

    if (Math.abs(+ratioDiff) < assetPair.gap) {
      i++
      continue
    }

    const side = balanceDiff > 0 ? 'bid' : 'ask'
    const volume = (Math.abs(balanceDiff) * price).toFixed(8)
    const ord_type = side === 'bid' ? 'price' : 'market'

    if (NODE_ENV !== 'production') {
      console.log('👀 - order', coinCode, side, price, volume)
      continue
    }

    // 주문
    await orderCoin({
      market: marketCodes[i],
      side,
      ...(side === 'ask' && { volume }),
      ...(side === 'bid' && { price: String(price) }),
      ord_type,
    })

    // 현재 자산 대기 주문 유지.삭제
    // const canceledOrders = []

    // for (const currAssetWaitingOrder of allAssetsWaitingOrders[i]) {
    //   const prevPrice = +currAssetWaitingOrder.price
    //   const prevVolume = +currAssetWaitingOrder.volume

    //   if (
    //     currAssetWaitingOrder.side === side &&
    //     prevPrice > price * 0.98 &&
    //     prevPrice < price * 1.02 &&
    //     prevVolume > rawVolume * 0.98 &&
    //     prevVolume < rawVolume * 1.02
    //   ) {
    //     await Promise.all(canceledOrders)
    //     continue revalancing
    //   }

    //   canceledOrders.push(cancelOrder(currAssetWaitingOrder.uuid))
    // }

    // // 다른 자산 대기 주문 유지.삭제
    // for (let j = 0; j < allAssetsWaitingOrders.length; j++) {
    //   if (j === i) continue

    //   for (const otherAssetWaitingOrder of allAssetsWaitingOrders[j]) {
    //     canceledOrders.push(cancelOrder(otherAssetWaitingOrder.uuid))
    //   }
    // }

    // await Promise.all(canceledOrders)
  }

  // revalancing: for (let i = 0; i < coinCount; i++) {
  //   // 리밸런싱 계산
  //   const coinCode = coinCodes[i]
  //   const coinStatistic = coinStatistics[coinCode]

  //   const price = coinStatistic.price
  //   const value = coinStatistic.value
  //   const ratio = (coinStatistic.ratio = (100 * value) / totalCurrValue)

  //   const targetRatio = coinStatistic.targetRatio
  //   const targetValue = (coinStatistic.targetValue = (totalCurrValue * targetRatio) / 100)

  //   const valueDiff = (coinStatistic.valueDiff = targetValue - value)
  //   const balanceDiff = (coinStatistic.balanceDiff = valueDiff / price)
  //   const ratioDiff = (coinStatistic.ratioDiff = targetRatio - ratio)

  //   if (Math.abs(valueDiff) < +MINIMUM_REBALANCING_AMOUNT) continue

  //   const minimumRebalancingGap = minimumRebalancingGaps[i]

  //   if (Math.abs(ratioDiff) < minimumRebalancingGap) {
  //     if (minimumRebalancingGap > +MINIMUM_REBALANCING_RATIO) {
  //       minimumRebalancingGaps[i] *= +REBALANCING_RATIO_DECREASING_RATE
  //     } else {
  //       minimumRebalancingGaps[i] = +MINIMUM_REBALANCING_RATIO
  //     }
  //     continue
  //   }

  //   const side = balanceDiff > 0 ? 'bid' : 'ask'
  //   const rawVolume = Math.abs(balanceDiff)
  //   const volume = rawVolume.toFixed(8)

  //   if (NODE_ENV !== 'production') {
  //     console.log('👀 - order', coinCode, side, price, volume)
  //     continue
  //   }

  //   // 현재 자산 대기 주문 유지.삭제
  //   const canceledOrders = []

  //   for (const currAssetWaitingOrder of allAssetsWaitingOrders[i]) {
  //     const prevPrice = +currAssetWaitingOrder.price
  //     const prevVolume = +currAssetWaitingOrder.volume

  //     if (
  //       currAssetWaitingOrder.side === side &&
  //       prevPrice > price * 0.98 &&
  //       prevPrice < price * 1.02 &&
  //       prevVolume > rawVolume * 0.98 &&
  //       prevVolume < rawVolume * 1.02
  //     ) {
  //       await Promise.all(canceledOrders)
  //       continue revalancing
  //     }

  //     canceledOrders.push(cancelOrder(currAssetWaitingOrder.uuid))
  //   }

  //   // 다른 자산 대기 주문 유지.삭제
  //   for (let j = 0; j < allAssetsWaitingOrders.length; j++) {
  //     if (j === i) continue

  //     for (const otherAssetWaitingOrder of allAssetsWaitingOrders[j]) {
  //       canceledOrders.push(cancelOrder(otherAssetWaitingOrder.uuid))
  //     }
  //   }

  //   await Promise.all(canceledOrders)

  //   // 주문
  //   await orderCoin({
  //     market: marketCodes[i],
  //     ord_type: 'limit',
  //     side,
  //     price: String(price),
  //     volume,
  //   })

  //   const coinCode_ = coinCode.padEnd(4, ' ')
  //   const gap = minimumRebalancingGap.toFixed(5)
  //   logWriter.write(`${printNow()} ${coinCode_} min_rebalance_gap: ${gap}\n`)
  //   minimumRebalancingGaps[i] *= +REBALANCING_RATIO_INCREASING_RATE

  //   // 최소 1시간마다 기록
  //   if (willCreateHistory) {
  //     willCreateHistory = false

  //     const statistics = Object.values(coinStatistics)

  //     pool
  //       .query(createAssetHistories, [
  //         Object.keys(coinStatistics),
  //         statistics.map((stat) => stat.balance),
  //         statistics.map((stat) => stat.price),
  //       ])
  //       .then(() =>
  //         setTimeout(() => {
  //           willCreateHistory = true
  //         }, 3600_000)
  //       )
  //   }
  // }

  // 통계 기록
  if (NODE_ENV !== 'production') {
    for (const coinCode in coinStatistics) {
      const coinStatistic = coinStatistics[coinCode]
      coinStatistic.value = Math.floor(coinStatistic.value)
      coinStatistic.ratio = coinStatistic.ratio.toFixed(3) as any
      // coinStatistic.targetValue = Math.floor(coinStatistic.targetValue)
      // coinStatistic.targetRatio = coinStatistic.targetRatio.toFixed(3) as any
      coinStatistic.balanceDiff = coinStatistic.balanceDiff.toFixed(8) as any
      coinStatistic.valueDiff = Math.floor(coinStatistic.valueDiff ?? 0)
      coinStatistic.ratioDiff = (coinStatistic.ratioDiff ?? 0).toFixed(3) as any
    }

    // console.log('👀 - candle_date_time_kst', currCandles[0][0].candle_date_time_kst)
    console.table(coinStatistics)
  }
}

async function rebalancePeriodically() {
  while (true) {
    try {
      await rebalanceAssets()
    } catch (error: any) {
      logWriter.write(`${printNow()} ${JSON.stringify(error.message)}\n`)
    }

    await sleep(REBALANCING_INTERVAL)
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
