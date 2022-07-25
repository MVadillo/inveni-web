// server.js

// set up ======================================================================
// get all the tools we need
const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const app = express()

const passport = require('passport')
const flash = require('connect-flash')

// Tools from myexpressapp
const path = require('path')
const favicon = require('serve-favicon')

// pass passport for configuration
require('./config/passport')(passport)

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs') // set up ejs for templating

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// create a write stream (in append mode)
// Descomentar estas lineas para logear a un archivo
// var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
// app.use(morgan('combined', {stream: accessLogStream}))

// set up our express application
// Comentar esta linea para logear a un archivo
app.use(morgan('dev')) // log every request to the console
app.use(cookieParser()) // read cookies (needed for auth)
app.use(bodyParser.urlencoded({	extended: true })) // to support URL-encoded bodies
app.use(bodyParser.json()) // to support JSON-encoded bodies
app.use(express.static(path.join(__dirname, '/public'))) // static content

// required for passport
app.use(session({
  secret: 'vidyapathaisalwaysrunning',
  resave: true,
  saveUninitialized: true
})) // session secret
app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in session

// routes ======================================================================
const index = require('./app/routes.js')(app, passport) // load our routes and pass in our app and fully configured passport

module.exports = app

console.log('Running in :' + process.env.NODE_ENV)
