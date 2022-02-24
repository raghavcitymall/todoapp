import * as express from "express"
const router = express.Router()
import Todo from "../models/todo"
import Group from "../models/group"
import User from "../models/user"
import auth from "../middleware/auth"
import * as mongoose from "mongoose"
import {Request , Response} from 'express'
import { ObjectId } from "mongodb";
import * as redis from "redis";
import { GroupDocument, TodoDocument, UserDocument } from "../@types/module";
import { Kafka } from 'kafkajs'


//const redisPort = process.env.PORT || 6379

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


const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092'],
  })

router.post('/todo', auth, async (req:Request, res:Response) => {
    const todo = new Todo({
        ...req.body,
        assigned_to: res.locals.user._id
    })

    try {
        if (req.body.group_id !== undefined) {
            const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
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

        const topic = 'todos'
        const producer = kafka.producer()
        await producer.connect()
        await producer.send({
            topic: topic,
            messages: [
                { value: JSON.stringify(todo) },
            ]
        })
        await producer.disconnect()

        const consumer = kafka.consumer({ groupId: 'consumer-group' })
        await consumer.connect()
        await consumer.subscribe({ topic: topic, fromBeginning: true })
        var consumerRes
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if ((message.value) && (JSON.parse((message.value).toString())._id) == (todo._id).toString()) {
                    consumerRes = JSON.parse((message.value).toString())
                }
            }
        })

        await todo.save()
        await client.lPush(res.locals.user._id + ":todos", JSON.stringify(await Todo.findOne( { _id: todo._id, assigned_to: res.locals.user._id})))
        res.send(consumerRes)
    } catch (e) {
        res.status(400).send(e)
    }        
})

router.get('/todos', auth, async (req:Request, res:Response) => {
    try {
        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
        var todosJSON:Array<TodoDocument|null> = []
        todos.forEach((element:string) => {
            todosJSON.push(JSON.parse(element))
        })
        res.send(todosJSON)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/todo/:id', auth, async (req:Request, res:Response) => {
    const _id = req.params.id

    try {
        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
        todos.forEach((element:string) => {
            if(_id === JSON.parse(element)._id){
                return res.send(JSON.parse(element))
            }
        })
        return res.status(404).send()
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/todo/:id', auth, async (req:Request, res:Response) => {
    const _id = req.params.id

    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'due_date', 'is_completed', 'group_id']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        if (req.body.group_id !== undefined) {
            const groups = await client.lRange(res.locals.user._id + ":groups", 0 , -1)
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

        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
        var todoBefore:TodoDocument|null = null
        for (var i = 0; i < todos.length; i++) {
            if(_id === JSON.parse(todos[i])._id){
                todoBefore = JSON.parse(todos[i])
                break
            }
        }

        if(!todoBefore) {
            return res.status(404).send()
        }

        await client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(todoBefore))
        updates.forEach((update) => {
            if(todoBefore) todoBefore.update = req.body.update
        })
        await Todo.updateOne( { _id: todoBefore._id }, todoBefore)
        await client.lPush(res.locals.user._id + ":todos", JSON.stringify(todoBefore))
        res.send(todoBefore)
    } catch (e) {
        res.status(400).send()
    }
})

router.delete('/todo/:id', auth, async (req, res) => {
    const _id = req.params.id

    try {
        const todos = await client.lRange(res.locals.user._id + ":todos", 0 , -1)
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
        
        await client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(todo))
        await Todo.deleteOne(todo)
        res.send(todo)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router