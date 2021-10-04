import fs from 'fs'

import { TICK_INTERVAL } from './options'
import { printNow } from '.'

export const tickWriter = fs
  .createWriteStream(`docs/${new Date().getTime()}-tick-${TICK_INTERVAL}.csv`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

// ${new Date().toLocaleString()}

tickWriter.write('Time,Open,High,Low,Close,Volume,RSI,CCI,MFI,Williams%R,Buy\n')

export const logWriter = fs
  .createWriteStream(`docs/${new Date().getTime()}-log.txt`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })
