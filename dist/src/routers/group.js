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
const group_1 = __importDefault(require("../models/group"));
const todo_1 = __importDefault(require("../models/todo"));
const auth_1 = __importDefault(require("../middleware/auth"));
const redis = __importStar(require("redis"));
let router = express.Router();
//const redisPort:string|Number = process.env.PORT || 6379
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
router.post('/group', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const group = new group_1.default(Object.assign(Object.assign({}, req.body), { owner: res.locals.user._id }));
    try {
        yield group.save();
        const groupMDB = yield group_1.default.findOne({ _id: group._id, owner: res.locals.user._id });
        yield client.lPush(res.locals.user._id + ":groups", JSON.stringify(groupMDB));
        res.status(201).send(groupMDB);
    }
    catch (e) {
        res.status(400).send(e);
    }
}));
router.get('/groups', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
        let groupsJSON = [];
        groups.forEach((element) => {
            groupsJSON.push(JSON.parse(element));
        });
        res.send(groupsJSON);
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.get('/group/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    try {
        const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
        let group = null;
        for (var i = 0; i < groups.length; i++) {
            if (_id === JSON.parse(groups[i])._id) {
                group = JSON.parse(groups[i]);
                break;
            }
        }
        if (!group) {
            return res.status(404).send();
        }
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todosJSON = [];
        todos.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
            const elementJSON = JSON.parse(element);
            if (elementJSON.group_id === _id) {
                todosJSON.push(elementJSON);
            }
        }));
        res.send(Object.assign(Object.assign({}, group), { "todos": todosJSON }));
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.patch('/group/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'is_completed'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }
    try {
        const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
        var groupBefore = null;
        var i = 0;
        for (; i < groups.length; i++) {
            if (_id === JSON.parse(groups[i])._id) {
                groupBefore = JSON.parse(groups[i]);
                break;
            }
        }
        if (!groupBefore) {
            return res.status(404).send();
        }
        const beforeUpdate = groupBefore.is_completed;
        updates.forEach((update) => {
            if (groupBefore)
                groupBefore.update = req.body.update;
        });
        yield group_1.default.updateOne({ _id: _id }, groupBefore);
        yield client.lSet(res.locals.user._id + ":groups", i, JSON.stringify(groupBefore));
        if (groupBefore.is_completed === true && beforeUpdate === false) {
            const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
            var j = 0;
            for (; j < todos.length; j++) {
                var elementJSON = JSON.parse(todos[j]);
                if (elementJSON.group_id === _id) {
                    yield todo_1.default.updateOne({ _id: elementJSON._id }, { "is_completed": true });
                    elementJSON.is_completed = true;
                    yield client.lSet(res.locals.user._id + ":todos", j, JSON.stringify(elementJSON));
                }
            }
        }
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todosJSON = [];
        todos.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
            const elementJSON = JSON.parse(element);
            if (elementJSON.group_id === _id) {
                todosJSON.push(elementJSON);
            }
        }));
        res.send(Object.assign(Object.assign({}, groupBefore), { "todos": todosJSON }));
    }
    catch (e) {
        console.log(e);
        res.status(500).send();
    }
}));
router.delete('/group/:id', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = req.params.id;
    try {
        const groups = yield client.lRange(res.locals.user._id + ":groups", 0, -1);
        var group = null;
        for (var i = 0; i < groups.length; i++) {
            if (_id === JSON.parse(groups[i])._id) {
                group = JSON.parse(groups[i]);
                break;
            }
        }
        if (!group) {
            return res.status(404).send();
        }
        yield client.lRem(res.locals.user._id + ":groups", 1, JSON.stringify(group));
        yield group_1.default.deleteOne({ _id: _id });
        const todos = yield client.lRange(res.locals.user._id + ":todos", 0, -1);
        var todosJSON = [];
        for (var i = 0; i < todos.length; i++) {
            const elementJSON = JSON.parse(todos[i]);
            if (elementJSON.group_id === _id) {
                todosJSON.push(elementJSON);
                yield client.lRem(res.locals.user._id + ":todos", 1, JSON.stringify(elementJSON));
                yield todo_1.default.deleteOne(elementJSON);
            }
        }
        res.send(Object.assign(Object.assign({}, group), { "todos": todosJSON }));
    }
    catch (e) {
        res.status(500).send();
    }
}));
module.exports = router;
