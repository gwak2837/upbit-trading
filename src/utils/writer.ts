import fs from 'fs'

import { TICK_INTERVAL } from './options'
import { printNow } from '.'

export const tickWriter = fs
  .createWriteStream(`docs/${new Date().getTime()}-tick-${TICK_INTERVAL}.csv`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

// ${new Date().toLocaleString()}

tickWriter.write('Open,High,Low,Close,Volume,RSI,MFI,CCI,Williams%R\n')

export const logWriter = fs.createWriteStream('docs/log.txt', { flags: 'a' }).on('finish', () => {
  console.log(`${printNow()} finish`)
})

export const buyingIndicatorWriter = fs
  .createWriteStream(`docs/${new Date().getTime()}-buying-indicator.csv`, { flags: 'a' })
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

buyingIndicatorWriter.write('RSI,MFI,CCI,Williams%R\n')
