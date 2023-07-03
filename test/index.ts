/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { PGURI } from '../src/common/constants'
import { pool } from '../src/common/postgres'
import getLastHistory from './getLastHistory.sql'
import getPreviousBalances from './getPreviousBalances.sql'

async function main() {
  const result = await Promise.all([
    pool.query(getPreviousBalances, ['2023-07-02 09:30:12.002124+00']),
    pool.query(getLastHistory),
  ])

  const prevHistory = result[0].rows.sort((a, b) =>
    a.asset < b.asset ? -1 : a.asset === b.asset ? 0 : 1
  )

  const lastHistory = result[1].rows.sort((a, b) =>
    a.asset < b.asset ? -1 : a.asset === b.asset ? 0 : 1
  )

  const oneYear = 31_536_000_000
  const timeDiff =
    new Date(lastHistory[0].creation_time).getTime() -
    new Date(prevHistory[0].creation_time).getTime()

  const prevBalanceCurrPrice = prevHistory.reduce(
    (acc, row, i) => acc + +row.balance * +lastHistory[i].price,
    0
  )
  const prevTotalAssetsValue = prevHistory.reduce((acc, row) => acc + +row.balance * +row.price, 0)
  const currTotalAssetsValue = lastHistory.reduce((acc, row) => acc + +row.balance * +row.price, 0)

  const relativeRate = (100 * currTotalAssetsValue) / prevBalanceCurrPrice - 100

  console.log('👀 -', prevHistory[0].creation_time, 'to', lastHistory[0].creation_time)
  console.log('👀 - 존버 수익:', Math.floor(prevBalanceCurrPrice - prevTotalAssetsValue), '원')
  console.log('👀 - 섀넌 수익:', Math.floor(currTotalAssetsValue - prevTotalAssetsValue), '원')
  console.log('👀 - 상대 수익:', Math.floor(currTotalAssetsValue - prevBalanceCurrPrice), '원')
  console.log(
    '👀 - 연간 수익:',
    Math.floor(((currTotalAssetsValue - prevBalanceCurrPrice) * oneYear) / timeDiff),
    '원'
  )
  console.log(
    '👀 - 존버 수익률:',
    ((100 * prevBalanceCurrPrice) / prevTotalAssetsValue - 100).toFixed(3),
    '%'
  )
  console.log(
    '👀 - 섀넌 수익률:',
    ((100 * currTotalAssetsValue) / prevTotalAssetsValue - 100).toFixed(3),
    '%'
  )
  console.log('👀 - 상대 수익률:', relativeRate.toFixed(3), '%')
  console.log('👀 - 연간 수익률:', ((relativeRate * oneYear) / timeDiff).toFixed(3), '%')
}

main()

pool
  .query('SELECT CURRENT_TIMESTAMP')
  .then(({ rows }) =>
    console.log(
      `🚅 Connected to ${PGURI} at ${new Date(rows[0].current_timestamp).toLocaleString()}`
    )
  )
  .catch((error) => {
    throw new Error('Cannot connect to PostgreSQL server... \n' + error)
  })
