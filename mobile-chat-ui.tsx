"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, X, Settings, Send, MicOff } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

// Define the SpeechRecognition type for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [lastResponse, setLastResponse] = useState("")
  const [inputMessage, setInputMessage] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize audio element and speech recognition
  useEffect(() => {
    // Initialize audio element
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

    // Initialize speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()

          // Configure speech recognition - let browser use default language
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = true
          // Remove all language setting - let browser decide

          recognitionRef.current.onstart = () => {
            console.log("Speech recognition started")
            setIsListening(true)
            setCurrentTranscript("")
          }

          recognitionRef.current.onresult = (event: any) => {
            let transcript = ""
            let isFinal = false

            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript
              if (event.results[i].isFinal) {
                isFinal = true
              }
            }

            setCurrentTranscript(transcript)
            console.log("Transcript:", transcript, "Final:", isFinal)

            // If we have a final result, process it
            if (isFinal && transcript.trim()) {
              setInputMessage(transcript.trim())
              setIsListening(false)
              // Auto-send the message after a short delay
              setTimeout(() => {
                sendMessage(transcript.trim())
              }, 500)
            }
          }

          recognitionRef.current.onend = () => {
            console.log("Speech recognition ended")
            setIsListening(false)

            // If we have a transcript but it wasn't final, still use it
            if (currentTranscript.trim() && !inputMessage) {
              setInputMessage(currentTranscript.trim())
              setTimeout(() => {
                sendMessage(currentTranscript.trim())
              }, 500)
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)

            // Handle specific errors with user-friendly messages
            switch (event.error) {
              case "not-allowed":
                console.log("Microphone access denied")
                setSpeechRecognitionSupported(false)
                break
              case "no-speech":
                console.log("No speech detected - this is normal")
                break
              case "language-not-supported":
                console.warn("Language not supported - disabling speech recognition")
                setSpeechRecognitionSupported(false)
                break
              case "network":
                console.log("Network error during speech recognition")
                break
              case "audio-capture":
                console.log("Microphone error")
                setSpeechRecognitionSupported(false)
                break
              case "aborted":
                console.log("Speech recognition was aborted")
                break
              default:
                console.log("Speech recognition error:", event.error)
                break
            }
          }

          setSpeechRecognitionSupported(true)
          console.log("Speech recognition initialized successfully")
        } catch (error) {
          console.error("Error initializing speech recognition:", error)
          setSpeechRecognitionSupported(false)
        }
      } else {
        console.warn("Speech recognition not supported in this browser")
        setSpeechRecognitionSupported(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log("Error stopping recognition:", e)
        }
      }
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

  const startListening = () => {
    if (!speechRecognitionSupported) {
      alert("Speech recognition is not supported in your browser. Please use the text input instead.")
      return
    }

    if (recognitionRef.current && !isListening && !isSpeaking && !isProcessing) {
      try {
        setCurrentTranscript("")
        setInputMessage("")
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        alert("Could not start speech recognition. Please try again.")
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
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

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else if (isListening) {
      stopListening()
    } else {
      startListening()
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
    setCurrentTranscript("")
    setShowTextInput(false)
    stopSpeaking()
    stopListening()
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { isSpeaking: isSpeaking || isListening } as any)
            : child,
        )}
      </div>

      {/* Mobile UI Overlay */}
      <div className="absolute inset-0 flex flex-col" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-white mb-4 drop-shadow-lg">
              {isProcessing
                ? "Processing..."
                : isSpeaking
                  ? "AI Speaking..."
                  : isListening
                    ? "Listening..."
                    : "Speak or Type to Chat"}
            </h1>

            {/* Show current transcript while listening */}
            {isListening && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white text-sm">{currentTranscript || "Listening..."}</p>
              </div>
            )}

            {/* Show last user input */}
            {inputMessage && !isListening && (
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

            {/* Speech recognition status */}
            {!speechRecognitionSupported && (
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white text-sm">Speech recognition not available. Use text input instead.</p>
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
                    : isListening
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : speechRecognitionSupported
                        ? "hover:bg-white/20 text-white"
                        : "bg-gray-500 text-gray-300"
              }`}
              disabled={isProcessing || !speechRecognitionSupported}
              onClick={handleMicClick}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
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
