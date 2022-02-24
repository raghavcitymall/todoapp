import * as express from "express"
const router = express.Router()
import User from "../models/user"
import auth from "../middleware/auth"
import {Request , Response} from 'express'
import { ObjectId } from "mongodb";
import { GroupDocument, TodoDocument, UserDocument, UserModel } from "../@types/module";

router.post('/user', async (req:Request, res:Response) => {
    let user = req.body

    try {
        user = new User(user);
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/user/login', async (req:Request, res:Response) => {
    try {
        //@ts-ignore
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send()
    }
})

router.post('/user/logout', auth, async (req:Request, res:Response) => {
    try {
        res.locals.user.tokens = res.locals.user.tokens.filter((token:string) => {
            return token !== res.locals.token
        })
        await res.locals.user.save()

        res.send(res.locals.user)
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/user/logoutAll', auth, async (req:Request, res:Response) => {
    try {
        res.locals.user.tokens = []
        await res.locals.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/user/me', auth, async (req:Request, res:Response) => {
    res.send(res.locals.user)
})

router.patch('/user/me', auth, async (req:Request, res:Response) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => res.locals.user[update] = req.body[update])
        await res.locals.user.save()
        res.send(res.locals.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/user/me', auth, async (req:Request, res:Response) => {
    try {
        await res.locals.user.remove()
        res.send(res.locals.user)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router