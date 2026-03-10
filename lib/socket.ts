import { io } from "socket.io-client"

export const socket = io("https://videocalling-1-rira.onrender.com", {
  transports: ["websocket"]
})

// export const socket = io("http://localhost:4000")