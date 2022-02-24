"use strict";
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
const express_1 = __importDefault(require("express"));
require('./db/mongoose');
const userRouter = require('./routers/user');
const todoRouter = require('./routers/todo');
const groupRouter = require('./routers/group');
const Todo = require('./models/todo');
const port = process.env.PORT || 3000;
var cron = require('node-cron');
var app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(userRouter);
app.use(todoRouter);
app.use(groupRouter);
cron.schedule('00 17 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const todos = yield Todo.find({});
    var today = new Date();
    var td = today.getDate();
    var tm = today.getMonth() + 1;
    var ty = today.getFullYear();
    todos.forEach((todo) => {
        var date = new Date(todo.due_date);
        var dd = date.getDate();
        var mm = date.getMonth() + 1;
        var yy = date.getFullYear();
        if (dd <= td && tm >= mm && ty >= yy) {
            todo.is_completed = true;
            todo.save();
        }
    });
}), {
    scheduled: true,
    timezone: "Asia/Kolkata"
});
app.listen(port, () => {
    console.log('Server is up on port ' + port);
});
