const express = require('express')
import redis from 'redis'
import { boolean } from 'webidl-conversions'
import { readlink } from 'fs'
import { send } from 'process'
import { group, groupCollapsed } from 'console'
const router = new express.Router()
const Todo = require('../models/todo')
const Group = require('../models/group')
const auth = require('../middleware/auth')

const redisPort = process.env.PORT || 6379

const client = redis.createClient()
client.connect()
client.on('error', (err) => {
    console.log('Connection Error: ' + err);
})
client.on('connect', (err) => {
    console.log('Redis Connection Established.')
})

router.post('/group', auth, async (req, res) => {
    const group = new Group({
        ...req.body,
        owner: req.user._id
    })

    try {
        await group.save()
        const groupMDB = await Group.findOne( { _id: group._id, owner: req.user._id})
        await client.lPush(req.user._id + ":groups", JSON.stringify(groupMDB))
        res.status(201).send(groupMDB)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.get('/groups', auth, async (req, res) => {
    try {
        const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
        var groupsJSON = []
        groups.forEach((element) => {
            groupsJSON.push(JSON.parse(element))
        })
        res.send(groupsJSON)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/group/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
        var group
        for (var i = 0; i<groups.length; i++) {
            if(_id === JSON.parse(groups[i])._id){
                group = JSON.parse(groups[i])
                break
            }
        }

        if (!group) {
            return res.status(404).send()
        }

        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        var todosJSON = []
        todos.forEach(async (element) => {
            const elementJSON = JSON.parse(element)
            if(elementJSON.group_id === group._id)
            {
                todosJSON.push(elementJSON)
            }
        })
        res.send({
            ...group,
            "todos": todosJSON
        })
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/group/:id', auth, async (req, res) => {
    const _id = req.params.id

    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'is_completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
        var groupBefore
        var i = 0
        for (; i < groups.length; i++) {
            if(_id === JSON.parse(groups[i])._id){
                groupBefore = JSON.parse(groups[i])
                break
            }
        }
        if (!groupBefore) {
            return res.status(404).send()
        }
        const beforeUpdate = groupBefore.is_completed
        updates.forEach((update) => groupBefore[update] = req.body[update])
        await Group.updateOne( { _id: _id }, groupBefore)
        await client.lSet(req.user._id + ":groups", i, JSON.stringify(groupBefore))

        if (groupBefore.is_completed === true && beforeUpdate === false) {
            const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
            var j = 0
            for (; j<todos.length; j++) {
                var elementJSON = JSON.parse(todos[j])
                if (elementJSON.group_id === _id) {
                    await Todo.updateOne( { _id: elementJSON._id}, { "is_completed": true })
                    elementJSON.is_completed = true
                    await client.lSet(req.user._id + ":todos", j, JSON.stringify(elementJSON))
                }
            }
        }
        const todos = await client.lRange(req.user._id + ":todos", 0, -1)
        var todosJSON = []
        todos.forEach(async (element) => {
            const elementJSON = JSON.parse(element)
            if(elementJSON.group_id === _id)
            {
                todosJSON.push(elementJSON)
            }
        })
        res.send({
            ...groupBefore,
            "todos": todosJSON
        })
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
})

router.delete('/group/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const groups = await client.lRange(req.user._id + ":groups", 0 , -1)
        var group
        for (var i = 0; i < groups.length; i++) {
            if(_id === JSON.parse(groups[i])._id){
                group = JSON.parse(groups[i])
                break
            }
        }
        if (!group) {
            return res.status(404).send()
        }

        await client.lRem(req.user._id + ":groups", 1, JSON.stringify(group))
        await Group.deleteOne(group)
        const todos = await client.lRange(req.user._id + ":todos", 0 , -1)
        var todosJSON = []
        for (var i = 0; i<todos.length; i++) {
            const elementJSON = JSON.parse(todos[i])
            if(elementJSON.group_id === _id)
            {
                todosJSON.push(elementJSON)
                await client.lRem(req.user._id + ":todos", 1, JSON.stringify(elementJSON))
                await Todo.deleteOne(elementJSON)
            }
        }
        res.send({
            ...group,
            "todos": todosJSON
        })
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router