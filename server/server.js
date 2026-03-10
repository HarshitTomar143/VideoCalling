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
    message: "Server is running fineee"
  })
})


let waitingUser = null

io.on("connection", (socket) => {

  console.log("User connected:", socket.id)

  

  socket.on("find-partner", () => {

    console.log("User searching:", socket.id)

    if (waitingUser && waitingUser.id !== socket.id) {

      const roomId = Math.random().toString(36).substring(7)

      console.log("Match found:", waitingUser.id, socket.id)

      socket.join(roomId)
      waitingUser.join(roomId)

      socket.emit("matched", roomId)
      waitingUser.emit("matched", roomId)

      waitingUser = null

    } else {
      waitingUser = socket
      socket.emit("waiting")
    }
  })
  socket.on("join-room", (roomId) => {

    console.log(`User ${socket.id} joined room ${roomId}`)

    socket.join(roomId)
    socket.to(roomId).emit("user-joined")

  })

  socket.on("offer", ({ roomId, offer }) => {
    console.log("Forwarding offer")
    socket.to(roomId).emit("offer", { offer })
  })

  socket.on("answer", ({ roomId, answer }) => {
    console.log("Forwarding offer")
    socket.to(roomId).emit("answer", {answer})
  })

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    console.log("Forwarding offer")
    socket.to(roomId).emit("ice-candidate", {candidate})
  })


  socket.on("disconnect", () => {

    console.log("User disconnected:", socket.id)

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null
    }

  })

})

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})