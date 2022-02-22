import express from 'express'
require('./db/mongoose')
const userRouter = require('./routers/user')
const todoRouter = require('./routers/todo')
const groupRouter = require('./routers/group')
const Todo = require('./models/todo')
const port = process.env.PORT || 3000
var cron = require('node-cron');

var app = express()

app.use(express.json())
app.use(userRouter)
app.use(todoRouter)
app.use(groupRouter)


cron.schedule('00 17 * * *',async () => {
    const todos = await Todo.find({})
    var today = new Date()
    var td = today.getDate()
    var tm = today.getMonth() + 1
    var ty = today.getFullYear()
    todos.forEach((todo) => {
        var date = new Date(todo.due_date)
        var dd = date.getDate()
        var mm = date.getMonth() + 1
        var yy = date.getFullYear()
        if(dd <= td && tm >= mm && ty >= yy) {
            todo.is_completed = true
            todo.save()
        }
    })
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

app.listen(port, () => {
    console.log('Server is up on port ' + port)
})