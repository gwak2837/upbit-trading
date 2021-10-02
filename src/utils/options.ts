import { v4 } from 'uuid'

export const ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''
export const UPBIT_API_URL = 'https://api.upbit.com'

export const upbitWebSocketRequestOption = [
  {
    ticket: v4(),
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

export const RSI_PERIOD = 14
export const RSI_BUYING_SIGNAL = 25
export const RSI_MUST_BUYING_SIGNAL = 10

export const CCI_PERIOD = 14
export const CCI_BUYING_SIGNAL = -150

export const MFI_PERIOD = 14
export const MFI_BUYING_SIGNAL = 20
export const MFI_MUST_BUYING_SIGNAL = 5

export const WILLIAMSR_PERIOD = 14
export const WILLIAMSR_BUYING_SIGNAL = -20

export const AUTO_SELLING_RATIO = 1.0015

export type Indicator = {
  rsi: number
  mfi: number
  cci: number
  willliamsR: number
}

export function goodToBuy(prevIndicator: Indicator, newIndicator: Indicator) {
  return (
    newIndicator.rsi < RSI_MUST_BUYING_SIGNAL ||
    newIndicator.rsi < MFI_MUST_BUYING_SIGNAL ||
    (prevIndicator.rsi < RSI_BUYING_SIGNAL &&
      newIndicator.rsi > RSI_BUYING_SIGNAL &&
      prevIndicator.cci < CCI_BUYING_SIGNAL &&
      newIndicator.cci > CCI_BUYING_SIGNAL) ||
    (newIndicator.cci < CCI_BUYING_SIGNAL &&
      newIndicator.mfi < MFI_BUYING_SIGNAL &&
      newIndicator.willliamsR < WILLIAMSR_BUYING_SIGNAL)
  )
}
