import fs from 'fs'

export const logWriter = fs.createWriteStream(`docs/log-${Date.now()}.txt`)

// export const assetsWriter = fs.createWriteStream(`docs/assets-${Date.now()}.csv`)
