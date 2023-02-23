export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function printNow() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }).padEnd(25, ' ')
}

export function addDecimal8(a: string, b: string) {
  const aa = a.split('.')
  const bb = b.split('.')

  return (
    (100_000_000 * +aa[0] +
      +(aa[1]?.padEnd(8, '0') ?? 0) +
      100_000_000 * +bb[0] +
      +(bb[1]?.padEnd(8, '0') ?? 0)) /
    100_000_000
  )
}
