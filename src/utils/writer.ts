import fs from 'fs'

import { printNow } from '.'

const startingDate = new Date()

// 매 60번째 tick 기록
export const tickWriter = fs
  .createWriteStream(`docs/${startingDate.getTime()}-tick.csv`)
  .on('finish', () => {
    console.log(`${printNow()} tickWriter finish`)
  })

tickWriter.write('Time, tick.tp, currentMoneyRatio, isTrading\n')

// order log 기록
export const logWriter = fs
  .createWriteStream(`docs/${startingDate.getTime()}-log.txt`)
  .on('finish', () => {
    console.log(`${printNow()} logWriter finish`)
  })

// 프로세스 상태 확인
const tenMinutes = 600_000

setInterval(() => {
  fs.stat(`docs/${startingDate.getTime()}-tick.txt`, (err, stats) => {
    if (err) throw err

    const now = new Date()

    if (now.getTime() - stats.mtime.getTime() > tenMinutes)
      throw new Error(`파일 수정일: ${stats.mtime.toLocaleString()}. 현재: ${now.toLocaleString()}`)

    console.log(`${now.toLocaleString()} 정상 동작 중...`)
  })
}, tenMinutes)
