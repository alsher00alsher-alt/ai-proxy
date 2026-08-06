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

io.on('connection', (socket) => {
    console.log('✅ Connected:', socket.id);

    // طلب كود الربط
    socket.on('request-pairing', (phone) => {
        console.log('📱 Pairing request:', phone);
        users[socket.id] = { phone, state: 'waiting' };
        socket.emit('pairing-code', '1234-5678'); // كود تجريبي
    });

    socket.on('verify-code', (code) => {
        if (users[socket.id]) {
            socket.emit('connected', users[socket.id].phone);
            console.log('✅ Verified:', users[socket.id].phone);
        }
    });

    socket.on('get-contacts', () => {
        socket.emit('contacts-list', [
            { jid: '201234567890', name: 'أحمد', phone: '01234567890' },
            { jid: '201098765432', name: 'محمد', phone: '01098765432' }
        ]);
    });

    socket.on('send-spam', (data) => {
        console.log('🚀 Spam:', data);
        socket.emit('action-done', 'تم الإرسال!');
    });

    socket.on('add-members', (data) => {
        console.log('👥 Add:', data);
        socket.emit('action-done', 'تمت الإضافة!');
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
    });
});

app.get('/ping', (req, res) => res.send('pong'));

server.listen(3000, () => console.log('✅ Running on 3000'));
