const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    socketId: String
});

module.exports = mongoose.model('User', userSchema);