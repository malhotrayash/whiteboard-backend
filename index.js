const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

/**
 * In-memory board history
 * We'll store an array of "segments".
 * A segment is a straight line from A -> B with style info.
 * { from: {x, y}, to: {x, y}, color: string, size: number }
 *
 * Coordinates are normalized 0..1 so any screen size can replay correctly.
 */
let segments = [];

io.on('connection', (socket) => {
    console.log('user connected:', socket.id);

    // Send existing board to the new client
    socket.emit('init', segments);

    // Receive a new drawn segment and broadcast it + save it
    socket.on('draw-segment', (seg) => {
        // Basic guard
        if (!seg?.from || !seg?.to) return;
        segments.push(seg);            // Persist in memory
        socket.broadcast.emit('draw-segment', seg); // Send to others
    });

    // Clear the board for everyone
    socket.on('clear-board', () => {
        segments = [];
        io.emit('clear-board');
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
