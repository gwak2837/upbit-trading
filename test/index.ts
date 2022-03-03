/* eslint-disable no-console */
import { COIN_CODE } from '../src/utils/options'
import { getAssets, getOrder, getOrders } from '../src/utils/upbit'

getAssets().then((asset) => console.log('👀 - asset', asset))

getOrders({
  market: COIN_CODE,
  limit: 5,
}).then((orders) => console.log('👀 - getOrders', orders))

getOrder('a1f53b38-2f19-49bd-b908-8b8dfc8545b2').then((order) =>
  console.log('👀 - getOrder', order)
)
