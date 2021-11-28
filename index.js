const express = require('express')
const app = express()
const port = 3000
const UserController = require('./controller/user.controller')
const AuthController = require('./controller/auth.controller')
const RoomController = require('./controller/room.controller')
const MessageController = require('./controller/message.controller')
const UserModel = require('./model/user.model')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
// const csrf = require('csurf')
const jsonwebtoken = require("jsonwebtoken")
const {secret} = require('./config')

async function checkLogin(req, res) {
  if (!req.user) {
    return res.status(401).send({message: 'unauthorized'})
  }
  const user = await UserModel.findOne({_id: req.user._id})
  if (!user) {
    return res.status(404).send({message: 'user not found'})
  }
}

app.use(bodyParser.json())
app.use(cookieParser())
app.use((req, res, next) => {
  if (!req.cookies.jwt) {
    return next()
  }
  req.user = jsonwebtoken.verify(req.cookies.jwt, secret)
  next()
})


app.use('/api/users', UserController)
app.use('/api/auth', AuthController)
app.use('/api/rooms', (req, res, next) => {
  checkLogin(req, res)
  next()
},RoomController)
app.use('/api/messages', (req, res, next) => {
  checkLogin(req, res);
  next();
}, MessageController)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})