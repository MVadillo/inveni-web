const express = require('express')
const compression = require('compression')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const passport = require('./passport_config').passport
const path = require('path')
const flash = require('connect-flash')
const fs = require('fs')
const util = require('util')
const MySQLStore = require('express-mysql-session')(session) // MySql para manejar los datos de sesion.
const dbOptions = require('./database_config').options
const config = require('config')

const apiRouter = require('../controller/api/index_controller').router
const webRouter = require('../controller/web/index_controller').router
const datenow = new Date()
let isoDate = datenow.toISOString().replaceAll(':', '').replaceAll('.', '').replaceAll('-', '')
isoDate = 'Log'.concat(isoDate) + '.log'
const accessLogStream = fs.createWriteStream(path.join(__dirname, isoDate), { flags: 'w' })
const logStdout = process.stdout

// const passportVerification = require('./passport_config').isLoggedIn
// const cors = require('cors')

const mySqlSessionStore = new MySQLStore(dbOptions)

const sessionMiddleware = session({
  secret: config.get('secret'),
  cookie: {
    httpOnly: false,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 3, // 3 dias
    expires: 1000 * 60 * 60 * 24 * 3
  },
  store: mySqlSessionStore,
  resave: false,
  saveUninitialized: false
})

const userNameMiddleware = (req, res, next) => {
  let username = ''
  let role = ''
  if (req.user !== undefined && req.user != null) {
    username = req.user.username
    role = req.user.role
  }
  res.locals.user = { username: username, role: role }
  next()
}

const app = express()
const PORT = process.env.port || 3000
const ENV = process.env.NODE_ENV || 'development'
console.log = function (d) { //
  accessLogStream.write(util.format(d) + '\n')
  logStdout.write(util.format(d) + '\n')
}

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.urlencoded({ limit: '50mb' }))

app.use(compression()) // added compression

app.set('views', path.join(__dirname, '..', 'view'))
app.set('view engine', 'ejs')
app.use(morgan('dev'))
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use('/', express.static(path.join(__dirname, '..', 'assets')))
app.use('/web/super', express.static(path.join(__dirname, '..', 'assets')))
app.use('/web/home', express.static(path.join(__dirname, '..', 'assets')))
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
app.use(userNameMiddleware)
app.use(flash())

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Authorization')
  next()
})
app.use(function (err, req, res, next) {
  console.log(err)
  res.status(500).send('Algo salio mal!')
})

// app.enable('view cache');

app.use('/api', apiRouter)
app.use('/web', webRouter)
app.get('/', (req, res) => {
  try {
    res.redirect('/web/home/inicio')
  } catch (e) {
    console.log(e)
    throw e
  }
})

const server = app.listen(PORT, (err) => {
  if (err) {
    console.log(util.format(err) + '\n')
  }
  console.log(`Running in ${ENV} on port ${PORT}.`)
})

require('./socket_config').init(server) // Socket init.

// let serverAdapter = require('../queues/socket_queues').serverAdapter
// serverAdapter.setBasePath('/admin/queues')
// app.use('/admin/queues', serverAdapter.getRouter());

// require('../alerts.js')(cron);
// let cron = require('node-cron');
// let alert = require('../helpers/cron.js')(cron);

app.post('/', passport.authenticate('local-login', {
  successRedirect: '/web/home/inicio', // redirect to the secure profile section
  failureRedirect: '/', // redirect back to the signup page if there is an error
  failureFlash: true // allow flash messages
}), function (req, res) {
  // If this function gets called, authentication was successful.
  // `req.user` contains the authenticated user.
  try {
    if (req.body.remember) {
      req.session.cookie.maxAge = 1000 * 60 * 3
    } else {
      req.session.cookie.expires = false
    }
    res.redirect('/')
  } catch (error) {
    console.log(error)
    throw error
  }
})
