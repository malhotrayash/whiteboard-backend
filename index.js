import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Store boards in memory for now
const boards = {};
// boards[boardId] = { name, segments: [], preview: null }

//
// REST API
//

// 1. Get list of boards
app.get("/boards", (req, res) => {
    const list = Object.keys(boards).map((id) => ({
        id,
        name: boards[id].name,
        preview: boards[id].preview || null,
    }));
    res.json(list);
});

// 2. Create new board
app.post("/boards", (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    boards[id] = { name: name || "Untitled Board", segments: [], preview: null };
    res.json({ id, name: boards[id].name });
});

// 3. Join existing board
app.get("/boards/:id", (req, res) => {
    const { id } = req.params;
    if (!boards[id]) {
        return res.status(404).json({ error: "Board not found" });
    }
    res.json({ id, name: boards[id].name, segments: boards[id].segments });
});

//
// Socket.IO events
//
io.on("connection", (socket) => {
    console.log("A user connected");

    // Join board room
    socket.on("join-board", (boardId) => {
        if (!boards[boardId]) {
            boards[boardId] = { name: "Untitled Board", segments: [], preview: null };
        }
        socket.join(boardId);
        // Send current board data
        socket.emit("init", boards[boardId].segments);
    });

    // Drawing events
    socket.on("draw-segment", ({ boardId, segment }) => {
        if (!boards[boardId]) return;
        boards[boardId].segments.push(segment);

        // Optionally update preview here later
        // boards[boardId].preview = generatePreviewImage(boards[boardId].segments);

        socket.to(boardId).emit("draw-segment", segment);
    });

    // Clear board
    socket.on("clear-board", (boardId) => {
        if (!boards[boardId]) return;
        boards[boardId].segments = [];
        io.to(boardId).emit("clear-board");
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
