import fs from 'fs'

import { printNow } from './common'
import { TICK_INTERVAL } from './options'

export const tickWriter = fs
  .createWriteStream(`docs/tick-${TICK_INTERVAL}-${new Date().getTime()}.csv`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

// ${new Date().toLocaleString()}

tickWriter.write('Open,High,Low,Close,Volume,RSI,MFI,CCI,Williams%R\n')

export const logWriter = fs.createWriteStream('docs/log.txt', { flags: 'a' }).on('finish', () => {
  console.log(`${printNow()} finish`)
})
