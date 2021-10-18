import fs from 'fs'

import { TICK_INTERVAL } from './options'
import { printNow } from '.'

export const startingDate = new Date()

export const tickWriter = fs
  .createWriteStream(`docs/${startingDate.getTime()}-tick-${TICK_INTERVAL}.csv`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

tickWriter.write('Time,Open,High,Low,Close,Volume,RSI,CCI,MFI,Williams%R,Buy\n')

export const logWriter = fs
  .createWriteStream(`docs/${startingDate.getTime()}-log.txt`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })
