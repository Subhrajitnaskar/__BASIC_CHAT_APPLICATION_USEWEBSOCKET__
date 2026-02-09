const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// LIMIT FILE SIZE (IMPORTANT FOR RENDER)
const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB max
    }
});

// Upload route with error handling
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        res.json({
            type: 'file',
            fileUrl: `/uploads/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileName: req.file.originalname
        });
    });
});

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('msgFromFrontend', (msg) => {
        io.emit('msgFromBackend', {
            type: 'text',
            msg
        });
    });

    socket.on('fileMessage', (data) => {
        io.emit('msgFromBackend', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
