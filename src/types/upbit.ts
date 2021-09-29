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
