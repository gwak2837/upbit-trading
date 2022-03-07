export const UPBIT_API_URL = 'https://api.upbit.com'
export const UPBIT_OPEN_API_ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const UPBIT_OPEN_API_SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''
export const COIN_CODE = process.env.COIN_CODE ?? ''
export const MIN_MONEY_RATIO = Number(process.env.MIN_MONEY_RATIO)
export const MAX_MONEY_RATIO = Number(process.env.MAX_MONEY_RATIO)
export const ORDER_PRICE_UNIT = Number(process.env.ORDER_PRICE_UNIT)
export const TICK_INTERVAL = Number(process.env.TICK_INTERVAL)

if (!UPBIT_OPEN_API_ACCESS_KEY) throw new Error('Requires UPBIT_OPEN_API_ACCESS_KEY')
if (!UPBIT_OPEN_API_SECRET_KEY) throw new Error('Requires UPBIT_OPEN_API_SECRET_KEY')
if (!COIN_CODE) throw new Error('Requires COIN_CODE')
if (!MIN_MONEY_RATIO) throw new Error('Requires MIN_MONEY_RATIO')
if (!MAX_MONEY_RATIO) throw new Error('Requires MAX_MONEY_RATIO')
if (!ORDER_PRICE_UNIT) throw new Error('Requires ORDER_PRICE_UNIT')
if (!TICK_INTERVAL) throw new Error('Requires TICK_INTERVAL')
