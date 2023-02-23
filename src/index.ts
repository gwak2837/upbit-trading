import { UpbitCandle, UpbitOrderDetail } from './types/upbit'
import { addDecimal8, printNow, sleep } from './utils'
import {
  MARKET_CODES,
  MINIMUM_REBALANCING_AMOUNT,
  MINIMUM_REBALANCING_RATIO,
  REBALANCING_INTERVAL,
  REBALANCING_RATIOS,
} from './utils/constants'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './utils/upbit'
import { logWriter } from './utils/writer'

const marketCodes = MARKET_CODES.split(',')
const targetRatios = REBALANCING_RATIOS.split(',').map((ratio) => +ratio)

if (marketCodes.length !== targetRatios.length)
  throw new Error('MARKET_CODES, REBALANCING_RATIOS 배열 길이가 다릅니다')

const coinCodes = marketCodes.map((market) => market.split('-')[1])
const coinCount = marketCodes.length
const totalTargetRatio = targetRatios.reduce((acc, ratio) => acc + ratio, 0)

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

  // 평가금액 계산
  const coinStatistics: CoinStatistics = {}

  for (let i = 0; i < coinCount; i++) {
    const coinCode = coinCodes[i]

    const asset = currAssets.find((asset) => asset.currency === coinCode)
    if (!asset) return

    const _ = asset.balance.split('.')
    const coinPrice = currCandles[i][0].trade_price

    coinStatistics[coinCode] = {
      price: coinPrice,
      balance: addDecimal8(asset.balance, asset.locked),
      value: ((+_[0] * 100_000_000 + +_[1].padEnd(8, '0')) * coinPrice) / 100_000_000,
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

    if (
      Math.abs(valueDiff) < +MINIMUM_REBALANCING_AMOUNT ||
      Math.abs(ratioDiff) < +MINIMUM_REBALANCING_RATIO
    )
      continue

    const orderSide = balanceDiff > 0 ? 'bid' : 'ask'

    if (process.env.NODE_ENV === 'production') {
      console.log(
        '👀 - order',
        coinCode,
        orderSide,
        String(price),
        Math.abs(balanceDiff).toFixed(8)
      )
      continue
    }

    const waitingOrders = allAssetsWaitingOrders[i]

    if (waitingOrders.length !== 0) {
      const canceledOrders = []

      for (const waitingOrder of waitingOrders) {
        const prevPrice = +waitingOrder.price
        const volume = +waitingOrder.volume

        if (
          waitingOrder.side === orderSide &&
          prevPrice > price * 0.95 &&
          prevPrice < price * 1.05 &&
          volume > Math.abs(balanceDiff) * 0.95 &&
          volume < Math.abs(balanceDiff) * 1.05
        )
          continue revalancing

        canceledOrders.push(cancelOrder(waitingOrder.uuid))

        const coinCode_ = coinCode.padEnd(4, ' ')
        const log = `${printNow()}, ${coinCode_} 주문 취소, 이전 주문: ${prevPrice} ${volume}, 현재 주문: ${prevPrice} ${balanceDiff}\n`
        logWriter.write(log)
      }

      await Promise.all(canceledOrders)
    }

    await orderCoin({
      market: marketCodes[i],
      ord_type: 'limit',
      side: orderSide,
      price: String(price),
      volume: Math.abs(balanceDiff).toFixed(8),
    })
  }

  if (process.env.NODE_ENV !== 'production') {
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

  // 자산 기록
  // assetsWriter.write(`Date,${currAssets.map((asset) => asset.currency).join(',')}\n`)
  // assetsWriter.write(`${printNow()},${currAssets.map((asset) => asset.balance).join(',')}\n`)
}

async function rebalancePeriodically() {
  while (true) {
    try {
      await rebalanceAssets()
    } catch (error: any) {
      logWriter.write(`${printNow()}, ${JSON.stringify(error.message)}\n`)
    }
    await sleep(+REBALANCING_INTERVAL)
  }
}

rebalancePeriodically()
