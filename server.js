const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const connectToDB = require("./config/db.js");

//Socket IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join_auction", (auctionId) => {
    socket.join(auctionId);
  });

  //   socket.on("disconnect", () => {
  //   });
});

async function startServer() {
  const PORT = process.env.PORT || 3000;
  await connectToDB();

  // 5. Listen using 'server' instead of 'app'
  server.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`);
  });
}

startServer();
