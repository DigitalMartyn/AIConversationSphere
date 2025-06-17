"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Settings } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isListening, setIsListening] = useState(true)

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">{children}</div>

      {/* Mobile UI Overlay - No Phone Frame */}
      <div className="absolute inset-0 flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-white mb-4 drop-shadow-lg">
              {isListening ? "I'm listening" : "How can I help?"}
            </h1>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-white/30">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-12 h-12 hover:bg-white/20 text-white"
              onClick={() => setIsListening(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full w-14 h-14 ${
                isListening ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-white/20 text-white"
              }`}
              onClick={() => setIsListening(!isListening)}
            >
              <Mic className="w-7 h-7" />
            </Button>

            <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 hover:bg-white/20 text-white">
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
