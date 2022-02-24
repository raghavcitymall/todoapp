import * as jwt  from 'jsonwebtoken'
import User from '../models/user'
import { NextFunction, Request, Response } from 'express'
import {  UserType } from '../@types/module'

const auth = async (req:Request,res:Response ,next:NextFunction) => {
    try {
        let token:string;
        if(req.header('Authorization') === undefined)
            throw new Error();
        else
            token = req.header('Authorization')!.replace('Bearer ','')
        let decoded = await jwt.verify(token, 'userlogin')
        if( typeof decoded == 'string')
            throw new Error('error')
        let user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!user) {
            throw new Error()
        }

        res.locals.token = token
        res.locals.user = user
        next()
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' })
    }
}

export default auth
