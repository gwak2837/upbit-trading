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
