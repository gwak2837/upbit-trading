import fetch, { RequestInfo, RequestInit } from 'node-fetch'

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function printNow() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

class Waiter {
  period = 500
  paused = false

  async wait() {
    let count = 100
    while (this.paused) {
      await sleep(this.period)
      if (count-- < 0) {
        this.paused = false
        break
      }
    }
  }

  pause() {
    this.paused = true

    setTimeout(() => {
      this.paused = false
    }, this.period)
  }
}

const waiter = new Waiter()

export async function fetchWithInterval<T>(url: RequestInfo, options?: RequestInit) {
  await waiter.wait()
  const a = await fetch(url, options)
  waiter.pause()
  return a.json() as unknown as T
}
