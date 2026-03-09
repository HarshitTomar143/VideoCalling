import {Server} from "socket.io"

export const runtime = "nodejs"

export async function GET(req: Request){
    const globalAny = global as any

    if(!globalAny.io){
        const io = new Server(3001,{
            cors:{
                origin: '*',
            },
        })

        io.on("conncetion",(socket)=>{
            console.log("User is connected")

            socket.on("join-room", (roomId: any)=>{
                socket.join(roomId)
                socket.to(roomId).emit("user-joined")
            })

            socket.on("offer", ({roomId, offer}: any)=>{
                socket.to((roomId).emit("offer", offer))
            })

            socket.on("answer", ({roomId, answer}:any)=>{
                socket.to((roomId).emit("answer",answer))
            })

            socket.on("ice-candidate", ({roomId, candidate}:any)=>{
                socket.to((roomId).emit("ice-candidate",candidate))
            })
        })

        globalAny.io = io
    }

    return new Response("Socket server running")
}