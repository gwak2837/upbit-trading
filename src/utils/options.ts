export const ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''
export const UPBIT_API_URL = 'https://api.upbit.com'

export const upbitWebSocketRequestOption = [
  {
    ticket: process.env.TICKET,
  },
  {
    type: 'ticker',
    codes: ['KRW-OMG'],
    isOnlyRealtime: true,
  },
  {
    format: 'SIMPLE',
  },
]

export const TICK_INTERVAL = 3

export const MFI_PERIOD = 14
export const RSI_PERIOD = 14
export const CCI_PERIOD = 14

export const AUTO_SELLING_RATIO = 1.002
