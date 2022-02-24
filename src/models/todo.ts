import Mongoose from 'mongoose'
import Validator from 'validator'

const todoSchema = new Mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    due_date: {
        type: Date,
        required: true,
        validate(value: any) {
            if (!Validator.isDate(value)) {
                throw new Error('Date is invalid')
            }
        }
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    assigned_to: {
        type: Mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    group_id: {
        type: Mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }
})

const Todo = Mongoose.model('Todo', todoSchema)

export default Todo;