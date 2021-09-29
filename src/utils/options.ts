export const ACCESS_KEY = process.env.UPBIT_OPEN_API_ACCESS_KEY ?? ''
export const SECRET_KEY = process.env.UPBIT_OPEN_API_SECRET_KEY ?? ''
export const SERVER_URL = 'https://api.upbit.com'

export const upbitWebSocketRequestOption = [
  {
    ticket: 'fiwjfoekhjwvhkjlvkhjoiuwoiu230823hiufhuw',
  },
  {
    type: 'ticker',
    codes: ['KRW-BTC'],
    isOnlyRealtime: true,
  },
  {
    format: 'SIMPLE',
  },
]

export const tickInterval = 4
