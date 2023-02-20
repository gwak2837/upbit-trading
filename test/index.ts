/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { UpbitCandle, UpbitError } from '../src/types/upbit'
import { getAssets, getMinuteCandles, getOrders } from '../src/utils/upbit'

// getAssets().then((asset) => console.log('👀 - asset', asset))

const marketCodes = ['KRW-BTC', 'KRW-XRP', 'KRW-DOGE', 'KRW-TRX']

Promise.all(
  marketCodes.map((marketCode) => getOrders({ market: marketCode, state: 'cancel' }))
).then((orders) => {
  //
})

// getMonthCandle().then((result) => console.log('👀 - getMonthCandle', result))

// getDepositHistory().then((result) => console.log('👀 - getDepositHistory', result))

// depositWon(5000).then((result) => console.log('👀 - depositWon', result))

// -는 위로 +는 아래로
