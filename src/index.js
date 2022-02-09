const express = require('express')
const redis = require('redis')
require('./db/mongoose')
const userRouter = require('./routers/user')
const todoRouter = require('./routers/todo')
const groupRouter = require('./routers/group')
const { boolean } = require('webidl-conversions')
const { readlink } = require('fs')
const { send } = require('process')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(userRouter)
app.use(todoRouter)
app.use(groupRouter)

app.listen(port, () => {
    console.log('Server is up on port ' + port)
})