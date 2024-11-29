const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Replace with your Vercel app URL
const allowedOrigins = ["https://confession-box.vercel.app/"];

// Use CORS middleware.
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials if needed.
  })
);

const availableUsers = new Set();

io.on("connection", (socket) => {
  availableUsers.add(socket.id);
  tryMatch();

  socket.on("disconnect", () => {
    availableUsers.delete(socket.id);
  });

  socket.on("next", () => {
    // End current chat and try to match again
    endCurrentChat(socket.id);
    availableUsers.add(socket.id);
    tryMatch();
  });
});

function tryMatch() {
  if (availableUsers.size >= 2) {
    const [user1, user2] = [...availableUsers].slice(0, 2);
    availableUsers.delete(user1);
    availableUsers.delete(user2);
    io.to(user1).to(user2).emit("matched", { partnerId: user2 });
  }
}

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
