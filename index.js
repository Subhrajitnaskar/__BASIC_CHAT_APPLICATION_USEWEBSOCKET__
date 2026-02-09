const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max
    }
});

// ================= FILE UPLOAD ROUTE =================
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        res.json({
            type: 'file',
            fileUrl: `/uploads/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileName: req.file.originalname
        });
    });
});

// ================= SOCKET.IO =================
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Save username
    socket.on('join', (username) => {
        socket.username = username;
        io.emit('msgFromBackend', {
            type: 'system',
            msg: `${username} joined the chat`
        });
    });

    // Text message
    socket.on('msgFromFrontend', (msg) => {
        io.emit('msgFromBackend', {
            type: 'text',
            msg,
            sender: socket.username
        });
    });

    // File message
    socket.on('fileMessage', (data) => {
        data.sender = socket.username;
        io.emit('msgFromBackend', data);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('msgFromBackend', {
                type: 'system',
                msg: `${socket.username} left the chat`
            });
        }
        console.log('User disconnected:', socket.id);
    });
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
