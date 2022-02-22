import mongoose from 'mongoose'

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
})

groupSchema.virtual('todos', {
    ref: 'Todo',
    localField: '_id',
    foreignField: 'group_id'
})

const Group = mongoose.model('Group', groupSchema)

module.exports = Group