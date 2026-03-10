"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { socket } from "@/lib/socket"

export default function Home() {

  const router = useRouter()
  const [status, setStatus] = useState("")

  useEffect(() => {

    socket.on("waiting", () => {
      setStatus("Searching for a partner...")
    })

    socket.on("matched", (roomId) => {
      router.push(`/room/${roomId}`)
    })

  }, [])

  const startChat = () => {
    socket.emit("find-partner")
  }

  return (

    <main className="min-h-screen flex items-center justify-center bg-black text-white">

      <div className="text-center space-y-6">

        <h1 className="text-4xl font-bold">
          Random Video Chat
        </h1>

        <button
          onClick={startChat}
          className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Start Chat
        </button>

        {status && (
          <p className="text-gray-400">
            {status}
          </p>
        )}

      </div>

    </main>

  )
}