import fs from 'fs'

import { TICK_INTERVAL } from './options'

export const tickWriter = fs
  .createWriteStream(`docs/tick-${TICK_INTERVAL}-${new Date().toLocaleString()}.csv`)
  .on('finish', () => {
    console.log('finish')
  })

export const logWriter = fs
  .createWriteStream('docs/coin-log.txt', { flags: 'a' })
  .on('finish', () => {
    console.log('finish')
  })

// tickWriter.write(
//   'type,code,opening_price,high_price,low_price,trade_price,prev_closing_price,acc_trade_price,change,change_price,signed_change_price,change_rate,signed_change_rate,ask_bid,trade_volume,acc_trade_volume,trade_date,trade_time,trade_timestamp,acc_ask_volume,acc_bid_volume,highest_52_week_price,highest_52_week_date,lowest_52_week_price,lowest_52_week_date,trade_status,market_state,market_state_for_ios,is_trading_suspended,delisting_date,market_warning,timestamp,acc_trade_price_24h,acc_trade_volume_24h,stream_type\n'
// )

tickWriter.write('open,high,low,close,volume,mfi,rsi,cci\n')
