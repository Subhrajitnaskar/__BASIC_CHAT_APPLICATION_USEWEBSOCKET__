const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const users = {};
const messages = {}; // store messages with comments

// ===== FILE UPLOAD SETUP =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

// ===== FILE UPLOAD ROUTE =====
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
    });
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {

    socket.on('join', (username) => {
        users[socket.id] = username;
        io.emit('msgFromBackend', {
            type: 'system',
            msg: `${username} joined the chat`
        });
    });

    socket.on('msgFromFrontend', (msg) => {
        const messageId = uuidv4();

        messages[messageId] = {
            comments: []
        };

        io.emit('msgFromBackend', {
            type: 'text',
            sender: users[socket.id],
            msg,
            messageId
        });
    });

    socket.on('fileMessage', (fileData) => {
        const messageId = uuidv4();

        messages[messageId] = {
            comments: []
        };

        io.emit('msgFromBackend', {
            type: 'file',
            sender: users[socket.id],
            ...fileData,
            messageId
        });
    });

    socket.on('commentMessage', (data) => {

        if (!messages[data.messageId]) return;

        const commentObj = {
            sender: users[socket.id],
            comment: data.comment
        };

        messages[data.messageId].comments.push(commentObj);

        io.emit('newComment', {
            messageId: data.messageId,
            ...commentObj
        });
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        delete users[socket.id];

        io.emit('msgFromBackend', {
            type: 'system',
            msg: `${username} left the chat`
        });
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
