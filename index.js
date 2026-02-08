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

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.json({
        type: 'file',
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileName: req.file.originalname
    });
});

io.on('connection', (socket) => {
    socket.on('msgFromFrontend', (msg) => {
        io.emit('msgFromBackend', {
            type: 'text',
            msg
        });
    });

    socket.on('fileMessage', (data) => {
        io.emit('msgFromBackend', data);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
