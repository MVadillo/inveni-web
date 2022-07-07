const Router = require('express').Router
const router = Router()

router.get('/signup', (req, res) => {
  res.render('pages/signup.ejs', { message: '' })
})

router.get('/login', (req, res) => {
  res.render('pages/login.ejs', { message: '' })
})

exports.router = router
