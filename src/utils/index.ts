export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function printNow() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}
