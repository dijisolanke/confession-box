const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
