const mongoose = require('mongoose')

const todoSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }
})

const Todo = mongoose.model('Todo', todoSchema)

module.exports = Todo