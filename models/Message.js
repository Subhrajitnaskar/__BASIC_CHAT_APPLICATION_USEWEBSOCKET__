const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    file: String,
    type: String,
    time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);