import { UpbitCandle, UpbitError, UpbitOrderDetail } from './types/upbit'
import { sleep } from './utils'
import { cancelOrder, getAssets, getMinuteCandles, getOrders, orderCoin } from './utils/upbit'

const marketCodes = ['KRW-BTC', 'KRW-XRP', 'KRW-DOGE', 'KRW-TRX']
const targetRatios = [20, 20, 20, 20, 20]

const totalTargetRatio = targetRatios.reduce((acc, cur) => acc + cur, 0)
const coinCodes = marketCodes.map((market) => market.split('-')[1])
const assetCodes = [...coinCodes, 'KRW']

async function rebalanceAssets() {
  const candles = marketCodes.map((market) => getMinuteCandles(1, { market }))
  const orders = marketCodes.map((market) => getOrders({ market }))

  // 가격 정보, 자산 정보 불러오기
  const result = await Promise.all([getAssets(), ...candles, ...orders])

  const currAssets = result[0]
  const currCandles = result.slice(1, candles.length + 1) as (UpbitCandle[] & UpbitError)[]
  const waitingOrders = result.slice(currCandles.length + 1) as (UpbitOrderDetail[] & UpbitError)[]

  // 미체결 주문 모두 취소
  await Promise.all(waitingOrders.flat().map((order) => cancelOrder(order.uuid)))

  // 코인 평가금액 계산
  const currPrices: number[] = []
  const currVolumes: number[] = []
  const currEvals: number[] = []

  for (let i = 0; i < currCandles.length; i++) {
    const candle = currCandles[i]
    if (candle.error) {
      console.error('👀 - candle.error', candle.error)
      break
    }

    const coinPrice = candle[0].trade_price
    currPrices.push(coinPrice)

    const coin = currAssets.find((asset) => asset.currency === coinCodes[i])
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
  const currRatios: number[] = []
  const targetEvals: number[] = []
  const rebalDiffEvals: number[] = []
  const rebalDiffRatios: number[] = []
  const orderVolumes: string[] = []
  const orderSides: ('ask' | 'bid')[] = []

  for (let i = 0; i < targetRatios.length; i++) {
    const currPrice = currPrices[i]
    const currEval = currEvals[i]
    const targetRatio = targetRatios[i]

    const currRatio = (100 * currEval) / totalCurrEval
    currRatios.push(currRatio)

    const targetEval = (totalCurrEval * targetRatio) / totalTargetRatio
    targetEvals.push(targetEval)

    const rebalDiffEval = targetEval - currEval
    if (Math.abs(rebalDiffEval) < 5050) return
    rebalDiffEvals.push(rebalDiffEval)

    const rebalDiffRatio = targetRatio - currRatio
    if (Math.abs(rebalDiffRatio) < 0.1) return
    rebalDiffRatios.push(rebalDiffRatio)

    if (i === targetRatios.length - 1) continue

    const orderVolume = rebalDiffEval / currPrice
    orderVolumes.push(Math.abs(orderVolume).toFixed(8))
    orderSides.push(orderVolume > 0 ? 'ask' : 'bid')
  }

  // 리밸런싱
  const rebalancingOrders = []

  for (let i = 0; i < orderSides.length; i++) {
    const order = orderCoin({
      market: marketCodes[i],
      ord_type: 'limit',
      side: orderSides[i],
      price: String(currPrices[i]),
      volume: orderVolumes[i],
    })
    rebalancingOrders.push(order)
  }

  await Promise.all(rebalancingOrders)

  // 결과
  // const table = {
  //   currPrice: new Table(currPrices),
  //   currVolume: new Table(currVolumes),
  //   currEval: new Table(currEvals.map((currEval) => Math.floor(currEval))),
  //   currRatio: new Table(currRatios.map((currRatio) => +currRatio.toFixed(2))),
  //   '': [],
  //   targetEval: new Table(targetEvals.map((targetEval) => Math.floor(targetEval))),
  //   targetRatio: new Table(targetRatios),
  //   ' ': [],
  //   rebalDiffEval: new Table(rebalDiffEvals.map((rebalDiffEval) => Math.floor(rebalDiffEval))),
  //   rebalDiffRatio: new Table(rebalDiffRatios.map((rebalDiffRatio) => +rebalDiffRatio.toFixed(2))),
  //   '  ': [],
  //   orderSide: new Table(orderSides),
  //   orderVolume: new Table(orderVolumes),
  // }
  // console.table(table, assetCodes)
}

class Table {
  constructor(arr: (number | string)[]) {
    for (let i = 0; i < assetCodes.length; i++) {
      const element = arr[i]
      ;(this as any)[assetCodes[i]] = element
    }
  }
}

async function main() {
  while (true) {
    await rebalanceAssets()
    await sleep(10_000)
  }
}

main()
