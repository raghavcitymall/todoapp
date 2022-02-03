const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    }
})

groupSchema.virtual('todos', {
    ref: 'Todo',
    localField: '_id',
    foreignField: 'group_id'
})

const Group = mongoose.model('Group', groupSchema)

module.exports = Group