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
    console.log('✅ Connected:', socket.id);

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

    // إرسال سبام
    socket.on('send-spam', (data) => {
        const { phone, target, message, count } = data;
        const user = users[phone];
        if (user) {
            io.to(user.socketId).emit('spam-command', { target, message, count });
        }
    });

    // إضافة أعضاء
    socket.on('add-members', (data) => {
        const { phone, groupId, numbers } = data;
        const user = users[phone];
        if (user) {
            io.to(user.socketId).emit('add-command', { groupId, numbers });
        }
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
