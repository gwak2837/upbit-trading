import request from 'request'

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function arrayMin(arr: number[]) {
  let len = arr.length
  let min = Infinity

  while (len--) {
    if (Number(arr[len]) < min) {
      min = Number(arr[len])
    }
  }

  return min
}

export function arrayMax(arr: number[]) {
  let len = arr.length
  let max = -Infinity

  while (len--) {
    if (Number(arr[len]) > max) {
      max = Number(arr[len])
    }
  }

  return max
}

export function sumArray(arr: number[]) {
  let result = 0

  for (var i = arr.length; i--; ) {
    result += arr[i]
  }

  return result
}

export function printNow() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

class Waiter {
  period = 500
  paused = false

  constructor(period?: number) {
    if (period) this.period = period
  }

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

export async function requestWithDelay<T>(options: request.RequiredUriUrl & request.CoreOptions) {
  await waiter.wait()
  return new Promise<T>((resolve, reject) => {
    request(options, (error, __, body) => {
      waiter.pause()
      if (error) reject(error)
      else resolve(body)
    })
  })
}
