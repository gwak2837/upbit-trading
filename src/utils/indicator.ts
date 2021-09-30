import { CCI, MFI, RSI, WilliamsR } from 'technicalindicators'

import { CCI_PERIOD, MFI_PERIOD, RSI_PERIOD } from './options'

export const mfi = new MFI({ high: [], low: [], close: [], volume: [], period: MFI_PERIOD })
export const rsi = new RSI({ values: [], period: RSI_PERIOD })
export const cci = new CCI({ high: [], low: [], close: [], period: CCI_PERIOD })
export const willliamsR = new WilliamsR({ high: [], low: [], close: [], period: CCI_PERIOD })
