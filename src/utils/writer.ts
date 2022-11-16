import fs from 'fs'

import { printNow } from '.'

const startingDate = new Date()

// 매 n번째 tick 기록
export const tickWriter = fs.createWriteStream(`docs/${startingDate.getTime()}-tick.csv`)
tickWriter.write('Time, tick.tp, currentMoneyRatio\n')

// order log 기록
export const logWriter = fs.createWriteStream(`docs/${startingDate.getTime()}-log.txt`)

// 프로세스 상태 확인
export const TEN_MINUTES = 600_000

setInterval(() => {
  fs.stat(`docs/${startingDate.getTime()}-tick.csv`, (err, stats) => {
    if (err) throw err

    const now = new Date()

    if (now.getTime() - stats.mtime.getTime() > TEN_MINUTES) {
      logWriter.write(
        `${printNow()}, 파일 수정일: ${stats.mtime.toLocaleString()}. 검사 시점: ${now.toLocaleString()}`
      )
      throw new Error()
    }
  })
}, TEN_MINUTES)
