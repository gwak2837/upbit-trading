/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { COIN_CODE, ORDER_PRICE_UNIT } from '../src/utils/config'
import { cancelOrder, getAssets, getOrder, getOrders, orderCoin } from '../src/utils/upbit'

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

// orderCoin({
//   market: COIN_CODE,
//   side: 'bid',
//   volume: `${Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / 45000000) / 100_000_000}`.padEnd(10, '0'),
//   price: '45000000',
//   ord_type: 'limit',
// }).then((order) => console.log('👀 - orderCoin', order))

// orderCoin({
//   market: COIN_CODE,
//   side: 'ask',
//   volume: `${Math.ceil((ORDER_PRICE_UNIT * 100_000_000) / 55000000) / 100_000_000}`.padEnd(10, '0'),
//   price: '55000000',
//   ord_type: 'limit',
// }).then((order) => console.log('👀 - orderCoin', order))
