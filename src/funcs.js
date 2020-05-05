const _ = require('lodash/fp')
const understory = require('understory')
const prairie = require('prairie')

module.exports = {
  ..._,
  ...understory,
  ...prairie,
}
