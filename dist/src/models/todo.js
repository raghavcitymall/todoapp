"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const todoSchema = new mongoose_1.default.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    due_date: {
        type: Date,
        required: true,
        validate(value) {
            if (!validator_1.default.isDate(value)) {
                throw new Error('Date is invalid');
            }
        }
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    assigned_to: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    group_id: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Group'
    }
});
const Todo = mongoose_1.default.model('Todo', todoSchema);
exports.default = Todo;
