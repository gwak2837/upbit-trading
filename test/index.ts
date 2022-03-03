/* eslint-disable no-console */
import { COIN_CODE } from '../src/utils/options'
import { getAsset, getOrder, getOrders } from '../src/utils/upbit'

getAsset().then((asset) => console.log('👀 - asset', asset))

getOrders({
  market: COIN_CODE,
  limit: 5,
}).then((asset) => console.log('👀 - getOrders', asset))

getOrder('0ce6ccd1-3358-4ed7-89af-35de932d55d4').then((asset) =>
  console.log('👀 - getOrder', asset)
)

const asset = [
  {
    currency: 'KRW',
    balance: '2019854.73778725',
    locked: '0.0',
    avg_buy_price: '0',
    avg_buy_price_modified: true,
    // unit_currency: 'KRW',
  },
  {
    currency: 'BTC',
    balance: '0.07461553',
    locked: '0.0088201',
    avg_buy_price: '59356959.0352',
    avg_buy_price_modified: true,
    // unit_currency: 'KRW',
  },
]
