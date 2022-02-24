"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const todo_1 = __importDefault(require("./todo"));
const validator_1 = __importDefault(require("validator"));
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
        validate(value) {
            if (!validator_1.default.isEmail(value)) {
                throw new Error('Email is invalid');
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
        validate(value) {
            if (value < 0) {
                throw new Error('Age must be a postive number');
            }
        }
    },
    tokens: [{
            token: {
                type: String,
                required: true
            }
        }]
});
userSchema.virtual('todos', {
    ref: 'Todo',
    localField: '_id',
    foreignField: 'assigned_to'
});
userSchema.virtual('groups', {
    ref: 'Group',
    localField: '_id',
    foreignField: 'owner'
});
userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.tokens;
    return userObject;
};
userSchema.methods.generateAuthToken = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const user = this;
        const token = yield jwt.sign({ _id: user._id.toString() }, 'userlogin');
        user.tokens.push(token);
        yield user.save();
        return token;
    });
};
userSchema.statics.findByCredentials = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield User.findOne({ email });
        if (!user) {
            throw new Error('Unable to login');
        }
        const isMatch = yield bcrypt.compare(password, user.password.toString());
        if (!isMatch) {
            throw new Error('Unable to login');
        }
        return user;
    }
    catch (e) {
        console.log(e);
        return null;
    }
});
// Hash the plain text password before saving
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = this;
        if (user.isModified('password')) {
            user.password = yield bcrypt.hash(user.password, 8);
        }
        next();
    });
});
// Delete user tasks when user is removed
userSchema.pre('remove', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = this;
        yield todo_1.default.deleteMany({ assigned_to: user._id });
        next();
    });
});
const User = mongoose.model("user", userSchema);
exports.default = User;
