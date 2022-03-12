import { Server } from "socket.io";

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;
    io.on("connection", (socket) => {
      socket.on("input-canvas", (msg) => {
        socket.broadcast.emit("update-canvas", msg);
      });
      socket.on("input-control", (type) => {
        socket.broadcast.emit("update-control", type);
      });
    });
  }
  res.end();
};

export default SocketHandler;