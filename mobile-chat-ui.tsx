"use client"

import React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Settings, Send } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState("")
  const [inputMessage, setInputMessage] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)

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

  const sendMessage = async (message: string) => {
    if (isProcessing || isSpeaking || !message.trim()) return

    setIsProcessing(true)

    try {
      console.log("Sending message to OpenAI:", message)

      // Send message to OpenAI
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
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
      const fallbackText = "Sorry, I encountered an error while processing your message. Please try again."
      setLastResponse(fallbackText)
      fallbackToSpeechSynthesis(fallbackText)
    }
  }

  const sendTestMessage = async () => {
    const testMessages = [
      "Hello! Please introduce yourself and tell me what you can help me with.",
      "What's the weather like today?",
      "Tell me a fun fact about space.",
      "How can you help me be more productive?",
      "What's your favorite programming language and why?",
    ]

    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)]
    await sendMessage(randomMessage)
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      await sendMessage(inputMessage)
      setInputMessage("")
      setShowTextInput(false)
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

  const handleChatClick = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      sendTestMessage()
    }
  }

  const toggleTextInput = () => {
    setShowTextInput(!showTextInput)
    if (!showTextInput) {
      // Focus the input when showing it
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement
        if (input) input.focus()
      }, 100)
    }
  }

  const clearAll = () => {
    setLastResponse("")
    setInputMessage("")
    setShowTextInput(false)
    stopSpeaking()
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
              {isProcessing ? "Asking AI..." : isSpeaking ? "AI Speaking..." : "Chat with AI"}
            </h1>

            {/* Show last user input */}
            {inputMessage && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white/90 text-sm">You: "{inputMessage}"</p>
              </div>
            )}

            {/* Show AI response */}
            {lastResponse && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white/80 text-sm">AI: "{lastResponse}"</p>
              </div>
            )}

            {/* Text Input Area */}
            {showTextInput && (
              <div className="mt-6 w-full max-w-md">
                <form onSubmit={handleTextSubmit} className="flex gap-2">
                  <Input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder:text-white/60"
                    disabled={isProcessing}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    disabled={isProcessing || !inputMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* Instructions */}
            {!lastResponse && !showTextInput && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white/70 text-sm">
                  Tap the chat button for a random AI conversation, or use the settings button to type your own message.
                </p>
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
              onClick={clearAll}
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
              onClick={handleChatClick}
            >
              <MessageCircle className="w-7 h-7" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full w-12 h-12 hover:bg-white/20 text-white ${showTextInput ? "bg-white/20" : ""}`}
              onClick={toggleTextInput}
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
