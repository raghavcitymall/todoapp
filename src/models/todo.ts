import mongoose from 'mongoose'
import validator from 'validator'

const todoSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    due_date: {
        type: Date,
        required: true,
        validate(value) {
            if (!validator.isDate(value)) {
                throw new Error('Date is invalid')
            }
        }
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }
})

const Todo = mongoose.model('Todo', todoSchema)

module.exports = Todo