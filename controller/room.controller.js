const express = require('express')
const RoomModel = require("../model/room.model")
const MessageModel = require("../model/message.model");
const {query, body, param, validationResult} = require("express-validator")
const router = express.Router()

/**
 * Find rooms by
 */
router.get('/',
    query('page')
        .optional()
        .isInt()
        .withMessage('page needs to be an integer'),
    async (req, res) => {
    const rooms = await RoomModel.find({},null,{sort: '-updateddAt', limit: 5, skip: (req.query.page-1)*5})
    rooms.forEach(function(room) {
        const user = room.users.find(user => user.id.toString() === req.user._id)
        if(user) {
            if(user.lastSeenAt < room.lastMessageSentAt) {
                room.hasNewContent = true;
                room.save();
            }
        }
    })
    res.send(rooms)
})

/**
 * Connect the current user to a room
 */
router.put('/connect/:id',
    param('id')
        .notEmpty()
        .withMessage('id is required')
        .isMongoId()
        .withMessage('id needs to be a mongodb id'),
    body('action')
        .trim()
        .escape(),
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
    if (req.body.action !== 'connect') {
        if (req.body.action === 'disconnect') {
            if (!room.users.some(user => user.id.toString() === req.user._id)) {
                return res.status(401).send({message: 'unauthorized'})
            }
            room.users.splice(room.users.findIndex(user => user.id.toString() === req.user._id), 1);
            room.save();
            if (room.users.length === 0) {
                room.deleteOne();
                return res.send({message: `user disconnected from the room : ${room.name}. there is no user in this room anymore, it has been removed.`})
            }
            return res.send({message: `user disconnected from the room : ${room.name}`})
        }
        return res.status(400).send({message: 'bad request'})
    }
    if(room.users.some(user=>user.id.toString() === req.user._id)) {
        return res.status(400).send({message: "bad request"});
    }
    room.users.push({id: req.user._id});
    room.save();
    res.send({room: room});
})

/**
 * Find all rooms the current user is connected to
 */
router.get('/me/',
    query('page')
        .optional()
        .isInt()
        .withMessage('page needs to be an integer'),
    async (req, res) => {
    const rooms = await RoomModel.find({'users.id': req.user._id},null,{sort: '-updateddAt', limit: 5, skip: (req.query.page-1)*5})
    rooms.forEach(function(room) {
        const user = room.users.find(user => user.id.toString() === req.user._id)

        if(user.lastSeenAt < room.lastMessageSentAt) {
            room.hasNewContent = true;
            room.save();
        }
    })
    res.send(rooms)
})

/**
 * Find by id
 */
router.get('/:id',
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
        const room = await RoomModel.findOne({_id: req.params.id})
        if (!room) {
            return res.status(404).send({message: 'room not found'})
        }
        res.send({room})
    })

/**
 * Create a room
 */
router.post('/', body("name").trim().escape(), async (req, res) => {
    try {
        let room = new RoomModel({name: req.body.name, users: [{id: req.user._id, lastSeenAt: new Date()}], lastSeenMessage: new Date()})
        room = await room.save()
        res.status(201).send({room: room})
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router