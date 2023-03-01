/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */

import { PGURI } from '../src/common/constants'
import { pool } from '../src/common/postgres'
import { getAssets, getMinuteCandles } from '../src/common/upbit'
import getPreviousBalances from './getPreviousBalances.sql'

async function getCurrentAssets() {
  const assets = await getAssets()
  if (!assets) return []

  const prices = assets
    .filter((asset) => asset.currency !== 'KRW')
    .map((asset) => getMinuteCandles(1, { market: `KRW-${asset.currency}` }))

  return [assets, ...prices] as const
}

async function main() {
  const result = await Promise.all([
    pool.query(getPreviousBalances, [
      '2023-02-27 12:04:41.730808+00',
      '2023-02-27 12:04:41.730808+00',
    ]),
  ])

  console.log('👀 - rows:', result[0].rows)
  // 존버 수익률
  // 섀넌 수익률
  // 존버 대비 섀넌 수익률
  // 연 환산 수익률
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
