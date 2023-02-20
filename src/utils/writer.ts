import fs from 'fs'

export const logWriter = fs.createWriteStream(`docs/${Date.now()}-log.txt`)
