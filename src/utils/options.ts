export const ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''
export const UPBIT_API_URL = 'https://api.upbit.com'

export const upbitWebSocketRequestOption = [
  {
    ticket: process.env.TICKET,
  },
  {
    type: 'ticker',
    codes: ['KRW-BTC'],
    isOnlyRealtime: true,
  },
  {
    format: 'SIMPLE',
  },
]

export const TICK_INTERVAL = 60

export const MFI_PERIOD = 14
export const MFI_BUYING_SIGNAL = 20

export const RSI_PERIOD = 14
export const RSI_BUYING_SIGNAL = 25

export const CCI_PERIOD = 14
export const CCI_BUYING_SIGNAL = -150

export const WILLIAMSR_PERIOD = 14
export const WILLIAMSR_BUYING_SIGNAL = 14

export const AUTO_SELLING_RATIO = 1.002
