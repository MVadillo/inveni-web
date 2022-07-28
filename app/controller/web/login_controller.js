const Router = require('express').Router
const router = Router()
const passport = require('../../config/passport_config')
const verifySignupRole = require('../../roles/app_roles').verifySignupRole
const userService = require('../../service/user_service')

router.get('/', (req, res) => {
  let reqFlash = {}
  if (req.flash) reqFlash = req.flash()
  res.render('pages/login.ejs', { message: reqFlash.message || '' })
})

// Envia al usuario a la página de inicio si su sesion es correcta *
router.post('/', passport.loginAuthenticator, (req, res) => {
  req.session.save((err) => {
    if (err) res.render('pages/login.ejs', { message: JSON.stringify(err) })
    res.redirect('/web/home/')
  })
})

// Redirecciona al usuario a la página de login y cierra su sesion
router.get('/logout', (req, res, next) => {
  req.logout(function (errr) {
    if (errr) return next(errr)
    req.session.save((err) => {
      if (err) return next(err)
      res.redirect('/web/login')
    })
  })
})

// Redirecciona al usuario a la página de signup
router.get('/signup', verifySignupRole(['SUPER USER']), (req, res) => {
  res.render('pages/signup.ejs', { message: '' })
})

// Envia el formulario para crear un usuario
router.post('/signup', passport.signUpAuthenticator)

// Redirecciona al usuario a la pagina de cambio de contraseña *
router.get('/changePass', (req, res) => {
  userService.getAllUsers().then((returnData) => {
    if (req.user === undefined) req.user = []
    res.render('pages/changePass.ejs', {
      message: '',
      users: JSON.stringify(returnData.users),
      user: JSON.stringify(req.user)
    })
  })
})

module.exports.router = router
