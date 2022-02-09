const express = require('express')
const redis = require('redis')
const Todo = require('../models/todo')
const Group = require('../models/group')
const auth = require('../middleware/auth')
const { boolean } = require('webidl-conversions')
const { readlink } = require('fs')
const { send } = require('process')
const router = new express.Router()

const redisPort = process.env.PORT || 6379

const client = redis.createClient(redisPort)
client.connect()
client.on('error', (err) => {
    console.log('Connection Error: ' + err);
})
client.on('connect', (err) => {
    console.log('Redis Connection Established.')
})

router.post('/todo', auth, async (req, res) => {
    const todo = new Todo({
        ...req.body,
        assigned_to: req.user._id
    })

    try {
        if (req.body.group_id !== undefined) {
            const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
            var group
            for (var i = 0; i < groups.length; i++) {
                if(req.body.group_id === JSON.parse(element)._id){
                    group = JSON.parse(element)
                    break
                }
            }
            if (!group) {
                return res.status(404).send("Invalid Group ID")
            }
        }

        await todo.save()
        await client.lPush(req.user._id + ":todos", JSON.stringify(await Todo.findOne( { _id: todo._id, assigned_to: req.user._id})))
        res.status(201).send(todo)
    } catch (e) {
        res.status(400).send(e)
    }        
})

router.get('/todos', auth, async (req, res) => {
    try {
        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        var todosJSON = []
        todos.forEach((element) => {
            todosJSON.push(JSON.parse(element))
        })
        res.send(todosJSON)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/todo/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        todos.forEach((element) => {
            if(_id === JSON.parse(element)._id){
                return res.send(JSON.parse(element))
            }
        })
        return res.status(404).send()
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/todo/:id', auth, async (req, res) => {
    const _id = req.params.id

    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'due_date', 'is_completed', 'group_id']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        if (req.body.group_id !== undefined) {
            const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
            var group
            for (var i = 0; i < groups.length; i++) {
                if(req.body.group_id === JSON.parse(groups[i])._id){
                    group = JSON.parse(groups[i])
                    break
                }
            }
            if (!group) {
                return res.status(404).send("Invalid Group ID")
            }
        }

        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        var todoBefore
        for (var i = 0; i < todos.length; i++) {
            if(_id === JSON.parse(todos[i])._id){
                todoBefore = JSON.parse(todos[i])
                break
            }
        }

        if(!todoBefore) {
            return res.status(404).send()
        }

        await client.lRem(req.user._id + ":todos", 1, JSON.stringify(todoBefore))
        updates.forEach((update) => todoBefore[update] = req.body[update])
        await Todo.updateOne( { _id: todoBefore._id }, todoBefore)
        await client.lPush(req.user._id + ":todos", JSON.stringify(todoBefore))
        res.send(todoBefore)
    } catch (e) {
        res.status(400).send()
    }
})

router.delete('/todo/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        var todo
        for (var i = 0; i < todos.length; i++) {
            if(_id === JSON.parse(todos[i])._id){
                todo = JSON.parse(todos[i])
                break
            }
        }
        if(!todo) {
            return res.status(404).send()
        }
        
        await client.lRem(req.user._id + ":todos", 1, JSON.stringify(todo))
        await Todo.deleteOne(todo)
        res.send(todo)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router