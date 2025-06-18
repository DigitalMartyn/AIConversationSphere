"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Settings } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const aiResponses = [
    "Hello! I'm your AI assistant. How can I help you today?",
    "I'm here to answer your questions and assist with various tasks.",
    "Feel free to ask me anything - I'm ready to help!",
    "I can help you with information, creative tasks, and problem-solving.",
    "What would you like to know or explore together?",
  ]

  const speakResponse = () => {
    if ("speechSynthesis" in window) {
      // Stop any current speech
      window.speechSynthesis.cancel()

      // Get a random response
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)]

      const utterance = new SpeechSynthesisUtterance(randomResponse)
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.volume = 0.8

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsListening(false)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
      }

      window.speechSynthesis.speak(utterance)
    }
  }

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">
        {React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { isSpeaking } as any) : child,
        )}
      </div>

      {/* Mobile UI Overlay - No Phone Frame */}
      <div className="absolute inset-0 flex flex-col" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-white mb-4 drop-shadow-lg">
              {isSpeaking ? "Speaking..." : isListening ? "I'm listening" : "How can I help?"}
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
                isSpeaking
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "hover:bg-white/20 text-white"
              }`}
              onClick={() => {
                if (isSpeaking) {
                  // Stop speaking if currently speaking
                  window.speechSynthesis.cancel()
                  setIsSpeaking(false)
                } else if (isListening) {
                  setIsListening(false)
                } else {
                  // Start AI response
                  speakResponse()
                }
              }}
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
