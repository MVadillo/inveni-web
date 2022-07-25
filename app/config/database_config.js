const createPool = require('promise-mysql').createPool
const config = require('config')

const options = {
  host: config.get('server.host'),
  user: config.get('server.user'),
  password: config.get('server.Password'),
  database: config.get('server.Database'),
  connectionLimit: 5000,
  insecureAuth: true
}

const mysqlPool = createPool(options)

module.exports = {
  connectionPool: mysqlPool,
  options: options
}
