import  Mongoose from 'mongoose'

const groupSchema = new Mongoose.Schema({
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
        type: Mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
})

groupSchema.virtual('todos', {
    ref: 'Todo',
    localField: '_id',
    foreignField: 'group_id'
})

const Group = Mongoose.model('Group', groupSchema)

export default Group;