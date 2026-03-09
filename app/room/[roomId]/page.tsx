"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { socket } from "@/lib/socket"

export default function RoomPage() {

  const { roomId } = useParams()

  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)

  const peerRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {

    

    async function startCall() {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      if (localVideo.current) {
        localVideo.current.srcObject = stream
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      })

      peerRef.current = peer

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream)
      })

      peer.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0]
        }
      }

      socket.on("user-joined",async()=>{
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        socket.emit("offer",{
            roomId,
            offer
        })
      })

      socket.on("offer", async (offer)=>{
        await peer.setRemoteDescription(offer)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        socket.emit("answer",{
            roomId,
            answer
        })
      })

      socket.on("answer", async (answer)=>{
        await peer.setRemoteDescription(answer)
      })

      peer.onicecandidate = (event)=>{
        if(event.candidate){
            socket.emit("ice-candidate",{
                roomId,
                candidate: event.candidate
            })
        }
      }

      socket.on("ice-candidate", async (candidate) => {
        await peer.addIceCandidate(candidate)
        })

      peer.ontrack = (event) => {
        if(remoteVideo.current){
            remoteVideo.current.srcObject = event.streams[0]
        }
      }  

      socket.emit("join-room", roomId)

    }

    startCall()

  }, [])

  return (
    <div>

      <h2>Room: {roomId}</h2>

      <video
        ref={localVideo}
        autoPlay
        playsInline
        muted
        style={{ width: "300px" }}
      />

      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        style={{ width: "300px" }}
      />

    </div>
  )
}