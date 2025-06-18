"use client"

import React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Settings } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState("")

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  React.useEffect(() => {
    audioRef.current = new Audio()

    audioRef.current.onplay = () => {
      setIsSpeaking(true)
      setIsProcessing(false)
    }

    audioRef.current.onended = () => {
      setIsSpeaking(false)
    }

    audioRef.current.onpause = () => {
      setIsSpeaking(false)
    }

    audioRef.current.onerror = (error) => {
      console.error("Audio playback error:", error)
      setIsSpeaking(false)
      setIsProcessing(false)
      fallbackToSpeechSynthesis()
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fallbackToSpeechSynthesis = (text?: string) => {
    const responseText = text || lastResponse || "Sorry, I couldn't generate audio."

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(responseText)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsProcessing(false)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setIsProcessing(false)
      }

      window.speechSynthesis.speak(utterance)
    } else {
      setIsProcessing(false)
    }
  }

  const sendTestMessage = async () => {
    if (isProcessing || isSpeaking) return

    setIsProcessing(true)

    try {
      console.log("Sending test message to OpenAI...")

      // Send test message to OpenAI
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello! Please introduce yourself and tell me what you can help me with.",
        }),
      })

      const chatData = await chatResponse.json()
      const aiResponse = chatData.response

      console.log("AI Response:", aiResponse)
      setLastResponse(aiResponse)

      // Convert response to speech
      const ttsResponse = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: aiResponse }),
      })

      if (ttsResponse.ok && ttsResponse.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await ttsResponse.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        if (audioRef.current) {
          audioRef.current.src = audioUrl

          audioRef.current.onended = () => {
            setIsSpeaking(false)
            URL.revokeObjectURL(audioUrl)
          }

          await audioRef.current.play()
        }
      } else {
        console.log("TTS failed, using browser speech synthesis")
        fallbackToSpeechSynthesis(aiResponse)
      }
    } catch (error) {
      console.error("Error:", error)
      const fallbackText =
        "Hello! I'm your AI assistant. I'm here to help you with questions, creative tasks, and problem-solving. How can I assist you today?"
      setLastResponse(fallbackText)
      fallbackToSpeechSynthesis(fallbackText)
    }
  }

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setIsProcessing(false)
  }

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      sendTestMessage()
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">
        {React.Children.map(children, (child) =>
          React.isValidElement(child) ? React.cloneElement(child, { isSpeaking: isSpeaking } as any) : child,
        )}
      </div>

      {/* Mobile UI Overlay */}
      <div className="absolute inset-0 flex flex-col" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-white mb-4 drop-shadow-lg">
              {isProcessing ? "Asking OpenAI..." : isSpeaking ? "AI Speaking..." : "Tap mic to test OpenAI"}
            </h1>

            {lastResponse && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white/80 text-sm">"{lastResponse}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-white/30">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-12 h-12 hover:bg-white/20 text-white"
              onClick={() => {
                setLastResponse("")
                stopSpeaking()
              }}
            >
              <X className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full w-14 h-14 transition-colors ${
                isProcessing
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : isSpeaking
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "hover:bg-white/20 text-white"
              }`}
              disabled={isProcessing}
              onClick={handleMicClick}
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
