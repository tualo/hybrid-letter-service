fs = require 'fs'
path = require 'path'

module.exports = (pathName,extension) ->
  result = []
  files = fs.readdirSync pathName
  (result.push(entry) for entry in files when path.extname(entry)==extension)
  result
