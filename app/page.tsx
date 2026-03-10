"use client"

import { useRouter } from "next/navigation"

export default function Home() {

  const router = useRouter()

  const createRoom = () => {
    const id = Math.random().toString(36).substring(7)
    router.push(`/room/${id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">

      <div className="text-center space-y-8 p-10 bg-gray-900/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-700">

        <h1 className="text-4xl font-bold">
          Start convertation now
        </h1>

       
        <button
          onClick={createRoom}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 transition rounded-lg font-semibold shadow-lg"
        >
          Find someone
        </button>

      </div>

    </main>
  )
}