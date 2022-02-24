
import * as mongoose from "mongoose"
import * as bcrypt from "bcryptjs"
import * as jwt from "jsonwebtoken"
import Todo from "./todo"
import { UserDocument, UserModel , UserType } from "../@types/module";
import validator from 'validator';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value: string) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true
    },
    age: {
        type: Number,
        default: 0,
        validate(value: number) {
            if (value < 0) {
                throw new Error('Age must be a postive number')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
})

userSchema.virtual('todos', {
    ref: 'Todo',
    localField: '_id',
    foreignField: 'assigned_to'
})

userSchema.virtual('groups', {
    ref: 'Group',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = await jwt.sign({ _id: user._id.toString() }, 'userlogin')

    user.tokens.push(token);
    await user.save()

    return token
}

userSchema.statics.findByCredentials = async (email:string, password:string):Promise<UserDocument|null> => {
    try {
        let user:UserDocument|null = await User.findOne({ email });

        if (!user) {
            throw new Error('Unable to login')
        }

        const isMatch = await bcrypt.compare(password, user.password.toString())

        if (!isMatch) {
            throw new Error('Unable to login')
        }   

        return user
    } catch (e) {
        console.log(e);
        return null;
    }
}

// Hash the plain text password before saving
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

// Delete user tasks when user is removed
userSchema.pre('remove', async function (next) {
    const user = this
    await Todo.deleteMany({ assigned_to: user._id })
    next()
})

const User = mongoose.model<UserDocument>("user", userSchema);

export default User;