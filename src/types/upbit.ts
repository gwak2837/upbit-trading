export type Asset = {
  currency: string
  balance: string
  locked: string
  avg_buy_price: string
  avg_buy_price_modified: boolean
  unit_currency: string
}

export type UpbitDeposit = {
  type: string
  uuid: string
  currency: string
  txid: string
  state: string
  created_at: string
  done_at: string | null
  amount: string
  fee: string
  transaction_type: string
}

export type UpbitCandle = {
  market: string
  candle_date_time_utc: string
  candle_date_time_kst: string
  opening_price: number
  high_price: number
  low_price: number
  trade_price: number
  timestamp: number
  candle_acc_trade_price: number
  candle_acc_trade_volume: number
  first_day_of_period: string
}

export interface UpbitOrder {
  uuid: string
  side: string
  ord_type: string
  price: string
  state: string
  market: string
  created_at: string
  volume: string
  remaining_volume: string
  reserved_fee: string
  remaining_fee: string
  paid_fee: string
  locked: string
  executed_volume: string
  trades_count: number
}

export interface UpbitOrderDetail extends UpbitOrder {
  trades: [
    {
      market: string
      uuid: string
      price: string
      volume: string
      funds: string
      side: string
    }
  ]
}

export interface UpbitSocketSimpleResponse {
  ty: string
  cd: string
  op: number
  hp: number
  lp: number
  tp: number
  pcp: number
  atp: number
  c: string
  cp: number
  scp: number
  cr: number
  scr: number
  ab: string
  tv: number
  atv: number
  tdt: string
  ttm: string
  ttms: number
  aav: number
  abv: number
  h52wp: number
  h52wdt: string
  l52wp: number
  l52wdt: string
  ts: null
  ms: string
  msfi: null
  its: false
  dd: null
  mw: string
  tms: number
  atp24h: number
  atv24h: number
  st: string
}

export interface UpbitError {
  error: {
    name: string
    message: string
  }
}
