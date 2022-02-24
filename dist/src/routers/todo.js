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
const express = __importStar(require("express"));
const router = express.Router();
const todo_1 = __importDefault(require("../models/todo"));
const auth_1 = __importDefault(require("../middleware/auth"));
const redis = __importStar(require("redis"));
const kafkajs_1 = require("kafkajs");
//const redisPort = process.env.PORT || 6379
let client = redis.createClient();
const connect = () => __awaiter(void 0, void 0, void 0, function* () {
    yield client.connect();
    client.on('error', (err) => {
        console.log('Connection Error: ' + err);
    });
    client.on('connect', (err) => {
        console.log('Redis Connection Established.');
    });
});
connect();
const kafka = new kafkajs_1.Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092'],
});
router.post('/todo', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const todo = new todo_1.default(Object.assign(Object.assign({}, req.body), { assigned_to: res.locals.user._id }));
    try {
        if (req.body.group_id !== undefined) {
            const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
            var group;
            for (var i = 0; i < groups.length; i++) {
                if (req.body.group_id === JSON.parse(groups[i])._id) {
                    group = JSON.parse(groups[i]);
                    break;
                }
            }
            if (!group) {
                return res.status(404).send("Invalid Group ID");
            }
        }
        const topic = 'todos';
        const producer = kafka.producer();
        yield producer.connect();
        yield producer.send({
            topic: topic,
            messages: [
                { value: JSON.stringify(todo) },
            ]
        });
        yield producer.disconnect();
        const consumer = kafka.consumer({ groupId: 'consumer-group' });
        yield consumer.connect();
        yield consumer.subscribe({ topic: topic, fromBeginning: true });
        var consumerRes;
        yield consumer.run({
            eachMessage: ({ topic, partition, message }) => __awaiter(void 0, void 0, void 0, function* () {
                if ((message.value) && (JSON.parse((message.value).toString())._id) == (todo._id).toString()) {
                    consumerRes = JSON.parse((message.value).toString());
                }
            })
        });
        yield todo.save();
        yield client.lPush(res.locals.user._id + ":todos", JSON.stringify(yield todo_1.default.findOne({ _id: todo._id, assigned_to: res.locals.user._id })));
        res.send(consumerRes);
    }
    catch (e) {
        res.status(400).send(e);
    }
}));
router.get('/todos', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todosJSON = [];
        todos.forEach((element) => {
            todosJSON.push(JSON.parse(element));
        });
        res.send(todosJSON);
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.get('/todo/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    try {
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        todos.forEach((element) => {
            if (_id === JSON.parse(element)._id) {
                return res.send(JSON.parse(element));
            }
        });
        return res.status(404).send();
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.patch('/todo/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'due_date', 'is_completed', 'group_id'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }
    try {
        if (req.body.group_id !== undefined) {
            const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
            var group;
            for (var i = 0; i < groups.length; i++) {
                if (req.body.group_id === JSON.parse(groups[i])._id) {
                    group = JSON.parse(groups[i]);
                    break;
                }
            }
            if (!group) {
                return res.status(404).send("Invalid Group ID");
            }
        }
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todoBefore = null;
        for (var i = 0; i < todos.length; i++) {
            if (_id === JSON.parse(todos[i])._id) {
                todoBefore = JSON.parse(todos[i]);
                break;
            }
        }
        if (!todoBefore) {
            return res.status(404).send();
        }
        yield client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(todoBefore));
        updates.forEach((update) => {
            if (todoBefore)
                todoBefore.update = req.body.update;
        });
        yield todo_1.default.updateOne({ _id: todoBefore._id }, todoBefore);
        yield client.lPush(res.locals.user._id + ":todos", JSON.stringify(todoBefore));
        res.send(todoBefore);
    }
    catch (e) {
        res.status(400).send();
    }
}));
router.delete('/todo/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    try {
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todo;
        for (var i = 0; i < todos.length; i++) {
            if (_id === JSON.parse(todos[i])._id) {
                todo = JSON.parse(todos[i]);
                break;
            }
        }
        if (!todo) {
            return res.status(404).send();
        }
        yield client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(todo));
        yield todo_1.default.deleteOne(todo);
        res.send(todo);
    }
    catch (e) {
        res.status(500).send();
    }
}));
module.exports = router;
