const { bwd, cwd } = require('../utils')
const { Signale } = require('signale')
const fs = require('fs-extra')

const srcPath = `${cwd}/src`
const logger = new Signale({ interactive: true })

const dateLogger = (date = new Date()) => {
  const hour = date.getHours()
  const minute = date.getMinutes()

  return logger.scope(`${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}`)
}

const createHandler = fn => async (...args) => {
  const date = new Date()
  const path = args[0].slice(srcPath.length + 1)

  dateLogger(date).await(`Exporting '${path}'`)

  const result = await fn(...args)
  dateLogger().success(`Exported '${path}' (${new Date() - date}ms)`)

  return result
}

const copy = async path => {
  return fs.copy(path, path.replace(srcPath, bwd))
}

const unlinkHandler = async path => {
  return fs.unlink(path.replace(srcPath, bwd))
}

module.exports = {
  createHandler,
  unlinkHandler,
  copy,
}
