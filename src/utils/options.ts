import { v4 } from 'uuid'
import { UpbitSocketSimpleResponse } from '../types/upbit'

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
export const AUTO_SELLING_RATIO = 1.0015

export const RSI_PERIOD = 14
export const CCI_PERIOD = 14
export const MFI_PERIOD = 14
export const WILLIAMSR_PERIOD = 14

const RSI_BUYING_SIGNAL = 25
const RSI_MUST_BUYING_SIGNAL = 10
const RSI_MUST_NOT_BUYING_SIGNAL = 70

const CCI_BUYING_SIGNAL = -150

const MFI_BUYING_SIGNAL = 20
const MFI_MUST_NOT_BUYING_SIGNAL = 80
// export const MFI_MUST_BUYING_SIGNAL = 5

const WILLIAMSR_BUYING_SIGNAL = -20

export type Indicator = {
  rsi: number
  cci: number
  mfi: number
  willliamsR: number
}

export function goodToBuy(
  prevIndicator: Indicator,
  newIndicator: Indicator,
  ticker?: Partial<UpbitSocketSimpleResponse>
) {
  if (
    newIndicator.rsi > RSI_MUST_NOT_BUYING_SIGNAL ||
    newIndicator.mfi > MFI_MUST_NOT_BUYING_SIGNAL
  )
    return false

  return (
    newIndicator.rsi < RSI_MUST_BUYING_SIGNAL ||
    // newIndicator.mfi < MFI_MUST_BUYING_SIGNAL ||
    (prevIndicator.rsi < RSI_BUYING_SIGNAL &&
      newIndicator.rsi > RSI_BUYING_SIGNAL &&
      newIndicator.rsi < 50) ||
    (prevIndicator.cci < CCI_BUYING_SIGNAL &&
      newIndicator.cci > CCI_BUYING_SIGNAL &&
      newIndicator.cci < 0 &&
      newIndicator.rsi < RSI_BUYING_SIGNAL) ||
    newIndicator.mfi - prevIndicator.mfi > 10
    // (prevIndicator.mfi < MFI_BUYING_SIGNAL && newIndicator.mfi > MFI_BUYING_SIGNAL) ||
    // (prevIndicator.cci < CCI_BUYING_SIGNAL && newIndicator.cci > CCI_BUYING_SIGNAL) ||
    // (newIndicator.cci < CCI_BUYING_SIGNAL &&
    //   newIndicator.mfi < MFI_BUYING_SIGNAL &&
    //   newIndicator.willliamsR < WILLIAMSR_BUYING_SIGNAL)
  )
}
