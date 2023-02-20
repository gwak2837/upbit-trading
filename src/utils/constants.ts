export const UPBIT_API_URL = 'https://api.upbit.com'
export const UPBIT_OPEN_API_ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const UPBIT_OPEN_API_SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''

export const MARKET_CODES = process.env.MARKET_CODES as string
export const REBALANCING_RATIOS = process.env.REBALANCING_RATIOS as string
export const REBALANCING_INTERVALS = process.env.REBALANCING_INTERVALS as string

export const COIN_CODE = process.env.COIN_CODE ?? ''
export const MIN_MONEY_RATIO = Number(process.env.MIN_MONEY_RATIO)
export const MAX_MONEY_RATIO = Number(process.env.MAX_MONEY_RATIO)
export const ORDER_PRICE_UNIT = Number(process.env.ORDER_PRICE_UNIT)
export const TICK_INTERVAL = Number(process.env.TICK_INTERVAL)
export const DEPOSIT_BASE_UNIT = Number(process.env.DEPOSIT_BASE_UNIT)

if (!UPBIT_OPEN_API_ACCESS_KEY) throw new Error('Requires UPBIT_OPEN_API_ACCESS_KEY')
if (!UPBIT_OPEN_API_SECRET_KEY) throw new Error('Requires UPBIT_OPEN_API_SECRET_KEY')

if (!MARKET_CODES) throw new Error('Requires MARKET_CODES')
if (!REBALANCING_RATIOS) throw new Error('Requires REBALANCING_RATIOS')
if (!REBALANCING_INTERVALS) throw new Error('Requires REBALANCING_INTERVALS')
