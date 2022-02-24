import { Request } from 'express';
import { Document, Model, Mongoose } from "mongoose";
import * as mongoose from 'mongoose'

export interface UserType {
  name: string,
  email: string,
  password: string|Number,
  age: Number,
  token: Array<string>
}

export interface TodoType {
    description:string,
    due_date: Date,
    is_completed:Boolean,
    assigned_to:string,
    group_id:string,
}

export interface GroupType {
    name:string,
    is_completed:Boolean,
    owner:string,
}


export interface UserDocument extends  UserType , Document {
  findByCredentials(
    email:string,
    password: string
  ): Promise<UserDocument>
  }

export interface UserModel extends Model<UserDocument>, Model {
     findByCredentials(
      email:string,
      password: string
    ): Promise<UserDocument>
  }
export interface TodoDocument extends TodoType, Document {}
export interface TodoModel extends Model<TodoDocument> {}

export interface GroupDocument extends GroupType, Document {}
export interface GroupModel extends Model<GroupDocument> {}