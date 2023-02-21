export const MAXIMUM_CONCURRENT_REQUEST = 7

export const UPBIT_API_URL = 'https://api.upbit.com'
export const UPBIT_OPEN_API_ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY as string
export const UPBIT_OPEN_API_SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY as string

export const MARKET_CODES = process.env.MARKET_CODES as string
export const REBALANCING_RATIOS = process.env.REBALANCING_RATIOS as string
export const REBALANCING_INTERVALS = process.env.REBALANCING_INTERVALS as string
export const MINIMUM_REBALANCING_AMOUNT = process.env.MINIMUM_REBALANCING_AMOUNT as string
export const MINIMUM_REBALANCING_RATIO = process.env.MINIMUM_REBALANCING_RATIO as string

if (!UPBIT_OPEN_API_ACCESS_KEY) throw new Error('Requires UPBIT_OPEN_API_ACCESS_KEY')
if (!UPBIT_OPEN_API_SECRET_KEY) throw new Error('Requires UPBIT_OPEN_API_SECRET_KEY')

if (!MARKET_CODES) throw new Error('Requires MARKET_CODES')
if (!REBALANCING_RATIOS) throw new Error('Requires REBALANCING_RATIOS')
if (!REBALANCING_INTERVALS) throw new Error('Requires REBALANCING_INTERVALS')
if (!MINIMUM_REBALANCING_AMOUNT) throw new Error('Requires MINIMUM_REBALANCING_AMOUNT')
if (!MINIMUM_REBALANCING_RATIO) throw new Error('Requires MINIMUM_REBALANCING_RATIO')
