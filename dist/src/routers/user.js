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
const user_1 = __importDefault(require("../models/user"));
const auth_1 = __importDefault(require("../middleware/auth"));
router.post('/user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let user = req.body;
    try {
        user = new user_1.default(user);
        yield user.save();
        const token = yield user.generateAuthToken();
        res.status(201).send({ user, token });
    }
    catch (e) {
        res.status(400).send(e);
    }
}));
router.post('/user/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //@ts-ignore
        const user = yield user_1.default.findByCredentials(req.body.email, req.body.password);
        const token = yield user.generateAuthToken();
        res.send({ user, token });
    }
    catch (e) {
        res.status(400).send();
    }
}));
router.post('/user/logout', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.locals.user.tokens = res.locals.user.tokens.filter((token) => {
            return token !== res.locals.token;
        });
        yield res.locals.user.save();
        res.send(res.locals.user);
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.post('/user/logoutAll', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.locals.user.tokens = [];
        yield res.locals.user.save();
        res.send();
    }
    catch (e) {
        res.status(500).send();
    }
}));
router.get('/user/me', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send(res.locals.user);
}));
router.patch('/user/me', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }
    try {
        updates.forEach((update) => res.locals.user[update] = req.body[update]);
        yield res.locals.user.save();
        res.send(res.locals.user);
    }
    catch (e) {
        res.status(400).send(e);
    }
}));
router.delete('/user/me', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield res.locals.user.remove();
        res.send(res.locals.user);
    }
    catch (e) {
        res.status(500).send();
    }
}));
module.exports = router;
