import fs from 'fs'

import { printNow } from '.'

const startingDate = new Date()

export const logWriter = fs
  .createWriteStream(`docs/${startingDate.getTime()}-log.txt`)
  .on('finish', () => {
    console.log(`${printNow()} finish`)
  })

const fiveMinutes = 300_000

setInterval(() => {
  fs.stat(`docs/${startingDate.getTime()}-log.txt`, (err, stats) => {
    if (err) throw err

    const now = new Date()

    if (now.getTime() - stats.mtime.getTime() > fiveMinutes)
      throw new Error(`파일 수정일: ${stats.mtime.toLocaleString()}. 현재: ${now.toLocaleString()}`)

    console.log(`${now.toLocaleString()} 정상 동작 중...`)
  })
}, fiveMinutes)
