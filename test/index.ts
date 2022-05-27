/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { COIN_CODE, ORDER_PRICE_UNIT } from '../src/utils/config'
import {
  cancelOrder,
  depositWon,
  getAssets,
  getDepositHistory,
  getMonthCandle,
  getOrder,
  getOrders,
  orderCoin,
} from '../src/utils/upbit'

getAssets().then((asset) => console.log('👀 - asset', asset))

getOrders({
  market: COIN_CODE,
}).then((orders) => {
  for (const order of orders) {
    cancelOrder(order.uuid)
  }
})

getOrder('a1f53b38-2f19-49bd-b908-8b8dfc8545b2').then((order) =>
  console.log('👀 - getOrder', order)
)

getMonthCandle().then((result) => console.log('👀 - getMonthCandle', result))

getDepositHistory().then((result) => console.log('👀 - getDepositHistory', result))

// depositWon(5000).then((result) => console.log('👀 - depositWon', result))

// orderCoin({
//   market: COIN_CODE,
//   side: 'bid',
//   volume: `${Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / 10_000_000) / 100_000_000}`.padEnd(10, '0'),
//   price: '10_000_000',
//   ord_type: 'limit',
// }).then((order) => console.log('👀 - orderCoin', order))

// orderCoin({
//   market: COIN_CODE,
//   side: 'ask',
//   volume: `${Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / 1_000_000_000) / 100_000_000}`.padEnd(10, '0'),
//   price: '1_000_000_000',
//   ord_type: 'limit',
// }).then((order) => console.log('👀 - orderCoin', order))
