import * as express from "express";
import Group from "../models/group";
import Todo from "../models/todo";
import auth from "../middleware/auth";
import User from "../models/user";
import { ObjectId } from "mongodb";
import {Request , Response } from 'express';
import * as redis from "redis";
import { GroupDocument, TodoDocument, UserDocument } from "../@types/module";

let router =  express.Router();

//const redisPort:string|Number = process.env.PORT || 6379

let client:any = redis.createClient()
const connect = async () => {

    await client.connect();
    client.on('error', (err: string) => {
        console.log('Connection Error: ' + err);
    })
    client.on('connect', (err: any) => {
        console.log('Redis Connection Established.')
    })
};
connect()

router.post('/group', auth, async (req:Request, res:Response) => {
    const group = new Group({
        ...req.body,
        owner: res.locals.user._id
    })

    try {
        await group.save()
        const groupMDB = await Group.findOne( { _id: group._id, owner: res.locals.user._id})
        await client.lPush(res.locals.user._id + ":groups", JSON.stringify(groupMDB))
        res.status(201).send(groupMDB)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.get('/groups', auth, async (req:Request, res:Response) => {
    try {
        const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
        let groupsJSON:Array<GroupDocument|null> = []
        groups.forEach((element:string) => {
            groupsJSON.push(JSON.parse(element))
        })
        res.send(groupsJSON)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/group/:id', auth, async (req:Request, res:Response) => {
    const _id = req.params.id

    try {
        const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
        let group: { _id: any; } | null = null
        for (var i = 0; i<groups.length; i++) {
            if(_id === JSON.parse(groups[i])._id){
                group = JSON.parse(groups[i])
                break
            }
        }

        if (!group) {
            return res.status(404).send()
        }

        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
        var todosJSON:Array<TodoDocument|null> = []
        todos.forEach(async (element:string) => {
            const elementJSON = JSON.parse(element)
            if(elementJSON.group_id === _id)
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

router.patch('/group/:id', auth, async (req:Request, res:Response) => {
    const _id = req.params.id

    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'is_completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
        var groupBefore:GroupDocument|null = null
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
        updates.forEach((update) => {
            if(groupBefore) groupBefore.update = req.body.update
        })
        await Group.updateOne( { _id: _id }, groupBefore)
        await client.lSet(res.locals.user._id + ":groups", i, JSON.stringify(groupBefore))

        if (groupBefore.is_completed === true && beforeUpdate === false) {
            const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
            var j = 0
            for (; j<todos.length; j++) {
                var elementJSON:TodoDocument = JSON.parse(todos[j])
                if (elementJSON.group_id === _id) {
                    await Todo.updateOne( { _id: elementJSON._id}, { "is_completed": true })
                    elementJSON.is_completed = true
                    await client.lSet(res.locals.user._id + ":todos", j, JSON.stringify(elementJSON))
                }
            }
        }
        const todos = await client.lRange(res.locals.user._id + ":todos", 0, -1)
        var todosJSON:Array<TodoDocument|null> = []
        todos.forEach(async (element:string) => {
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

router.delete('/group/:id', auth, async (req:Request, res:Response) => {
    const _id = req.params.id

    try {
        const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
        var group:GroupDocument|null = null
        for (var i = 0; i < groups.length; i++) {
            if(_id === JSON.parse(groups[i])._id){
                group = JSON.parse(groups[i])
                break
            }
        }
        if (!group) {
            return res.status(404).send()
        }

        await client.lRem(res.locals.user._id + ":groups", 1, JSON.stringify(group))
        await Group.deleteOne({ _id: _id })
        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
        var todosJSON:Array<TodoDocument|null> = []
        for (var i = 0; i<todos.length; i++) {
            const elementJSON = JSON.parse(todos[i])
            if(elementJSON.group_id === _id)
            {
                todosJSON.push(elementJSON)
                await client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(elementJSON))
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