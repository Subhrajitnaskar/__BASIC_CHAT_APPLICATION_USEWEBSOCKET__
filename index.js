const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/chatapp')
.then(()=>console.log("MongoDB Connected"));

// Setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// Upload
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Routes
app.get('/', (req, res) => res.render('index'));
app.post('/chat', (req, res) => res.render('chat', { username: req.body.username }));
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ file: req.file.filename });
});

let users = {};

// SOCKET
io.on('connection', (socket) => {

    // JOIN
    socket.on('join', async (username) => {
        users[socket.id] = username;
        socket.username = username;

        console.log(`🟢 ${username} joined | Socket: ${socket.id}`);

        await User.create({ username, socketId: socket.id });

        io.emit('userList', Object.values(users));

        
        Object.values(users).forEach(user => {
            if (user !== username) {
                socket.emit('systemMessage', `🟢 ${user} already in chat`);
            }
        });

        io.emit('systemMessage', `🟢 ${username} joined the chat`);
    });

    // MESSAGE
    socket.on('sendMessage', async (data) => {

        // BAD WORD FILTER (added only)
        const badWords = ["badword", "idiot", "stupid"];
        const msgLower = data.message.toLowerCase();

        if (badWords.some(word => msgLower.includes(word))) {
            socket.emit('systemMessage', "🙂 Please keep chat friendly.");
            return;
        }

        const otpMatch = data.message.match(/\b\d{4,6}\b/);

        if (otpMatch && !data.confirmed) {
            socket.emit('otpConfirm', {
                message: data.message,
                time: new Date().toLocaleTimeString()
            });
            return;
        }

        const msg = await Message.create({
            sender: socket.username,
            message: data.message,
            type: "text"
        });

        io.emit('receiveMessage', msg);
    });

    // PRIVATE MESSAGE FIXED
    socket.on('privateMessage', ({ toUser, message }) => {

        const receiverSocket = Object.keys(users).find(
            id => users[id].toLowerCase() === toUser.toLowerCase()
        );

        if (receiverSocket) {

            io.to(receiverSocket).emit('privateMessage', {
                sender: socket.username,
                message
            });

            socket.emit('privateMessage', {
                sender: `(You → ${toUser})`,
                message
            });

        } else {
            socket.emit('systemMessage', "❌ User not found");
        }
    });

    // FILE
    socket.on('fileMessage', async ({ file }) => {

        const msg = await Message.create({
            sender: socket.username,
            file,
            type: "file"
        });

        io.emit('fileMessage', msg);
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
        const username = users[socket.id];

        console.log(`🔴 ${username} left | Socket: ${socket.id}`);

        delete users[socket.id];

        await User.deleteOne({ socketId: socket.id });

        io.emit('userList', Object.values(users));

        if (username) {
            io.emit('systemMessage', `🔴 ${username} left the chat`);
        }
    });
});

// START
server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});