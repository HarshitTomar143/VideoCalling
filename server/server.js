const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running"
  })
})


io.on("connection", (socket) => {

  console.log("User connected")

  socket.on("join-room", (roomId) => {
    socket.join(roomId)
    socket.to(roomId).emit("user-joined")
  })

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer)
  })

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer)
  })

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate)
  })

})

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})