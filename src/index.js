const express = require('express')
require('./db/mongoose')
const Todo = require('./models/Todo')
const Group = require('./models/Group')
const { boolean } = require('webidl-conversions')
const { readlink } = require('fs')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

app.post('/todo', async (req, res) => {
    const todo = new Todo(req.body)

    try {
        await todo.save()
        res.status(201).send(todo)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/incompletetodo', async (req, res) => {
    try {
        const todos = await Todo.find({ completed: false})
        res.send(todos)
    } catch (e) {
        res.status(500).send()
    }
})

app.get('/completetodo', async (req, res) => {
    try {
        const todos = await Todo.find({ completed: true})
        res.send(todos)
    } catch (e) {
        res.status(500).send()
    }
})

app.get('/todo', async (req, res) => {
    try {
        const todos = await Todo.find({})
        res.send(todos)
    } catch (e) {
        res.status(500).send()
    }
})

app.get('/todo/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const todo = await Todo.findById(_id)
        if (!todo) {
            return res.status(404).send()
        }
        res.send(todo)
    } catch (e) {
        res.status(500).send()
    }
})

app.patch('/todo/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const todoBefore = await Todo.findById(_id)
        if(!todoBefore) {
            return res.status(404).send()
        }
        const beforeUpdate = todoBefore.completed
        const todoAfter = await Todo.findByIdAndUpdate(_id, req.body, { new: true })
        if (todoAfter.completed !== beforeUpdate && todoAfter.group_id !== undefined) {
            const groupId = todoAfter.group_id
            var flag = true
            const group = await Group.findById(groupId).populate('todos')
            const n = group.todos.length
            for (var i = 0; i < n; i++) {
                if(group.todos[i].completed === false) {
                    flag = false
                    break
                }
            }
            if (group.completed !== flag) {
                await Group.findByIdAndUpdate(groupId, { "completed": flag })
            }
        }
        res.send(todoAfter)
    } catch (e) {
        res.status(400).send()
    }

})

app.delete('/todo/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const todo = await Todo.findByIdAndDelete(_id)

        if(!todo) {
            return res.status(404).send()
        }
        res.send(todo)
    } catch (e) {
        res.status(500).send()
    }
})

app.post('/group', async (req, res) => {
    const group = new Group(req.body)

    try {
        await group.save()
        res.status(201).send(group)
    } catch (e) {
        res.status(400).send(e)
    }
})

app.get('/group', async (req, res) => {
    try {
        const groups = await Group.find({})
        res.send(groups)
    } catch (e) {
        res.status(500).send()
    }
})

app.get('/group/:id', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id).populate('todos')
        if (!group) {
            return res.status(404).send()
        }
        res.send(group.todos)
    } catch (e) {
        res.status(500).send()
    }
})

app.patch('/group/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const groupBefore = await Group.findById(_id)
        if (!groupBefore) {
            return res.status(404).send()
        }
        const beforeUpdate = groupBefore.completed
        const groupAfter = await Group.findByIdAndUpdate(_id, req.body, { new: true })

        if( beforeUpdate !== groupAfter.completed && beforeUpdate === false) {
            const group = await groupAfter.populate('todos')
            group.todos.forEach(async (element) => {
                await Todo.findByIdAndUpdate(element._id, { "completed": true })
            })
        }

        res.send(groupAfter)
    } catch (e) {
        res.status(500).send()
    }
})

app.delete('/group/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const group = await Group.findById(_id).populate('todos')
        
        if(!group) {
            return res.status(404).send()
        }

        group.todos.forEach(async (element) => { 
            delete element.group_id
            await Todo.findByIdAndDelete(element._id)
            const todo = new Todo({
                "description": element.description,
                "completed": element.completed
            })
            await todo.save()
        })
        await Group.findByIdAndDelete(_id)
        res.send(group)
    } catch (e) {
        res.status(500).send()
    }
})

app.listen(port, () => {
    console.log('Server is up on port ' + port)
})