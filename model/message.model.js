const mongoose = require('./mongoose')

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        maxlength: 2000,
        required: true
    },
    author: {
        type: 'ObjectId',
        ref: 'User'
    },
    room: {
        type: 'ObjectId',
        ref: 'Room'
    },
    isUnseen : Boolean
}, {timestamps: true});

const MessageModel = mongoose.model('message', messageSchema);

module.exports = MessageModel