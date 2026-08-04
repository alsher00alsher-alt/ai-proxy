const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let users = {};
let messages = [];

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.on('register', (data) => {
        users[data.phone] = { socketId: socket.id };
        console.log('📱 Registered:', data.phone);
        socket.emit('registered');
    });

    socket.on('chat', (data) => {
        messages.push(data);
        if (messages.length > 1000) messages.shift();
        io.emit('message', data);
    });

    socket.on('disconnect', () => {
        for (let p in users) {
            if (users[p].socketId === socket.id) delete users[p];
        }
    });
});

app.get('/api/messages', (req, res) => res.json(messages.slice(-200)));
app.get('/api/users', (req, res) => res.json(Object.keys(users)));

server.listen(3000, () => console.log('✅ Running on 3000'));
