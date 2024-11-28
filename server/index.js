io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("callUser", ({ userToCall, signalData, from }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from: from });
  });

  socket.on("answerCall", ({ signal, to }) => {
    io.to(to).emit("callAccepted", signal);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
