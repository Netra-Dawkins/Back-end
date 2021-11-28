const express = require('express')
const MessageModel = require("../model/message.model");
const {query, body, param, validationResult} = require("express-validator")
const RoomModel = require("../model/room.model");
const router = express.Router()

/**
 * Find messages by
 */
router.get('/',
    query('page')
        .optional()
        .isInt()
        .withMessage('page needs to be an integer'),
    query('limit')
        .optional()
        .isInt()
        .withMessage('limit needs to be an integer'),
    async (req, res) => {
    let lim = 5;
    if (req.query.limit) {
        lim = parseInt(req.query.limit)
    }
    const messages = await MessageModel.find({},null,{sort: '-createdAt', limit: lim, skip: (req.query.page-1)*lim})
    const messageCount = await MessageModel.count();
    res.send({message: messages, limit: lim, page: req.query.page, total: messageCount})
})

/**
 * Find all the messages the current user is the author of
 */
router.get('/me',
    query('page')
        .optional()
        .isInt()
        .withMessage('page needs to be an integer'),
    async (req, res) => {
    const messages = await MessageModel.find({author: req.user._id},null,{sort: '-createdAt', limit: 5, skip: (req.query.page-1)*5})
    res.send(messages)
})

/**
 * Find messages by room
 */
router.get('/:id/',
    param('id')
        .notEmpty()
        .withMessage('id is required')
        .isMongoId()
        .withMessage('id needs to be a mongodb id'),
    query('page')
        .optional()
        .isInt()
        .withMessage('page needs to be an integer'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        next()
    },
    async (req, res) => {
    const room = await RoomModel.findOne({_id: req.params.id})
    if (!room) {
        return res.status(404).send({message: 'room not found'})
    }
    if (!room.users.some(user => user.id.toString() === req.user._id)) {
        return res.status(401).send({message: 'unauthorized !'})
    }
    const messages = await MessageModel.find({room: req.params.id},null,{sort: '-createdAt', limit: 5, skip: (req.query.page-1)*5})
    user = room.users.find(user => user.id.toString() === req.user._id)
    for(message of messages) {
        if(message.createdAt > user.lastSeenAt) {
            message.isUnseen = true;
            message.save();
        } else {
            message.isUnseen = false;
            message.save();
        }
    }
    user.lastSeenAt = new Date();
    room.hasNewContent = false;
    room.save();
    res.send(messages)
})

/**
 * Create a message
 */
router.post('/',
    body("content")
        .trim()
        .escape()
        .isLength({max: 2000})
        .withMessage("message can't be longer than 2000 char"),
    body("room")
        .trim()
        .escape(),
    async (req, res) => {
    const room = await RoomModel.findOne({_id: req.body.room})
    if (!room) {
        return res.status(404).send({message: 'room not found'})
    }
    if (!room.users.some(user => user.id.toString() === req.user._id)) {
        return res.status(401).send({message: 'unauthorized'})
    }
    try {
        let message = new MessageModel({content:req.body.content, author:req.user._id, room:req.body.room})
        message = await message.save()
        room.lastMessageSentAt = new Date()
        room.save()
        res.status(201).send({message: message})
    } catch (e) {
        res.status(400).send(e)
    }
})

/**
 * Modify a message
 */
router.put('/',
    body("content")
        .trim()
        .escape()
        .isLength({max: 2000})
        .withMessage("message can't be longer than 2000 char"),
    body('message')
        .notEmpty()
        .withMessage('id is required')
        .isMongoId()
        .withMessage('id needs to be a mongodb id'),
    async (req, res) => {
        const message = await MessageModel.findOne({_id: req.body.message})
        if (!message) {
            return res.status(404).send({message: 'message not found'})
        }
        if (!message.author === req.user._id) {
            return res.status(401).send({message: 'unauthorized'})
        }
        try {
            message.content = req.body.content;
            message.save()
            res.status(201).send({message: message})
        } catch (e) {
            res.status(400).send(e)
        }
    })

/**
 * Delete a message
 */
router.delete('/:id',
    param('id')
        .notEmpty()
        .withMessage('id is required')
        .isMongoId()
        .withMessage('id needs to be a mongodb id'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        next()
    },
    async (req, res) => {
    const message = await MessageModel.findOne({_id: req.params.id})
    if (!message) {
        return res.status(404).send({message: 'message not found'})
    }
    if (!message.author === req.user._id) {
        return res.status(401).send({message: 'unauthorized'})
    }
    try {
        message.room = undefined;
        await message.save()
        res.status(201).send({message: message})
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router