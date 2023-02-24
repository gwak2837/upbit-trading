import pg from 'pg'

import { PGURI, POSTGRES_CA, POSTGRES_CERT, POSTGRES_KEY } from './constants'
import { printNow } from './utils'
import { logWriter } from './writer'

const { Pool } = pg

export const pool = new Pool({
  connectionString: PGURI,

  ...(POSTGRES_CA &&
    POSTGRES_KEY &&
    POSTGRES_CERT && {
      ssl: {
        ca: `-----BEGIN CERTIFICATE-----\n${POSTGRES_CA}\n-----END CERTIFICATE-----`,
        key: `-----BEGIN PRIVATE KEY-----\n${POSTGRES_KEY}\n-----END PRIVATE KEY-----`,
        cert: `-----BEGIN CERTIFICATE-----\n${POSTGRES_CERT}\n-----END CERTIFICATE-----`,
        checkServerIdentity: () => {
          return undefined
        },
      },
    }),
})

pool.on('error', (err) => {
  logWriter.write(`${printNow()}, ${err.message}`)
})
