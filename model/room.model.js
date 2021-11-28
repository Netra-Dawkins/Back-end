const mongoose = require('./mongoose')

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        maxlength: 50,
    },
    users: [
        {
            id: {
                type: 'ObjectId',
                ref: 'User'
            },
            lastSeenAt: {
                type: Date
            }
        }
    ],
    lastMessageSentAt: {
        type: Date
    },
    hasNewContent: {
        type: Boolean
    }
}, {timestamps: true});

const RoomModel = mongoose.model('room', roomSchema);

module.exports = RoomModel