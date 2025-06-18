"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Settings } from "lucide-react"

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
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userTranscript, setUserTranscript] = useState("")
  const [lastUserInput, setLastUserInput] = useState("")
  const [speechSupported, setSpeechSupported] = useState(false)
  const [responseCount, setResponseCount] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const aiResponses = [
    "Hello! I'm your AI assistant. How can I help you today?",
    "I'm here to answer your questions and assist with various tasks.",
    "Feel free to ask me anything - I'm ready to help!",
    "I can help you with information, creative tasks, and problem-solving.",
    "What would you like to know or explore together?",
    "I'm powered by advanced AI technology and I'm here to make your day better.",
    "Whether you need help with work, creativity, or just want to chat, I'm here for you.",
    "I can assist with writing, analysis, problem-solving, and much more. What interests you?",
    "That's a great question! I love helping people learn new things.",
    "I'm always excited to have a conversation. What's on your mind?",
    "Thanks for chatting with me! I'm here whenever you need assistance.",
    "I enjoy our conversations! Is there anything specific you'd like to discuss?",
    "I'm designed to be helpful, harmless, and honest. How can I support you today?",
    "Every conversation is unique and interesting to me. What would you like to talk about?",
    "I'm here to make your day a little easier. What can I help you with?",
  ]

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

    // Initialize speech recognition with minimal configuration
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()

          // Minimal configuration to avoid language issues
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = false
          // Don't set language - let it use browser default

          recognitionRef.current.onstart = () => {
            console.log("Speech recognition started")
            setIsListening(true)
            setUserTranscript("")
            setSpeechSupported(true)
          }

          recognitionRef.current.onresult = (event: any) => {
            if (event.results.length > 0) {
              const transcript = event.results[0][0].transcript
              console.log("Speech result:", transcript)
              setUserTranscript(transcript)
            }
          }

          recognitionRef.current.onend = () => {
            console.log("Speech recognition ended")
            setIsListening(false)

            // Process the transcript
            if (userTranscript.trim()) {
              setLastUserInput(userTranscript.trim())
              handleUserSpeechComplete(userTranscript.trim())
            } else {
              // If no transcript, provide a default response
              handleUserSpeechComplete("")
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)
            setIsProcessing(false)

            // For any error, just disable speech recognition and use demo mode
            setSpeechSupported(false)

            // Still provide a response
            setTimeout(() => {
              handleUserSpeechComplete("I couldn't hear you clearly, but I'm here to help!")
            }, 500)
          }

          // Test if speech recognition works by checking if we can create it
          setSpeechSupported(true)
        } catch (error) {
          console.error("Error initializing speech recognition:", error)
          setSpeechSupported(false)
        }
      } else {
        console.warn("Speech recognition not supported in this browser")
        setSpeechSupported(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Handle when user finishes speaking
  const handleUserSpeechComplete = async (transcript: string) => {
    setIsProcessing(true)

    // Small delay to show processing state
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Generate AI response
    await speakAIResponse(transcript)
  }

  const fallbackToSpeechSynthesis = (text?: string) => {
    const responseText = text || getNextResponse()

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(responseText)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8

      // Try to get a good voice
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        const preferredVoice = voices.find(
          (voice) =>
            voice.name.includes("Google") ||
            voice.name.includes("Microsoft") ||
            voice.name.includes("Alex") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Female") ||
            voice.lang.includes("en"),
        )
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }
      }

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

  const getNextResponse = () => {
    // Cycle through responses or pick randomly
    const response = aiResponses[responseCount % aiResponses.length]
    setResponseCount((prev) => prev + 1)
    return response
  }

  const speakAIResponse = async (userInput: string) => {
    if (!audioRef.current) return

    try {
      const responseText = getNextResponse()

      console.log("User said:", userInput)
      console.log("AI responding:", responseText)

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: responseText }),
      })

      if (response.ok && response.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        audioRef.current.src = audioUrl

        audioRef.current.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
        }

        await audioRef.current.play()
      } else {
        console.log("OpenAI TTS API error, using fallback")
        fallbackToSpeechSynthesis(responseText)
      }
    } catch (error) {
      console.error("Error with AI response:", error)
      fallbackToSpeechSynthesis()
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking && !isProcessing) {
      try {
        setUserTranscript("")
        recognitionRef.current.start()
      } catch (e) {
        console.error("Error starting speech recognition:", e)
        // If speech recognition fails, just provide a demo response
        setSpeechSupported(false)
        handleUserSpeechComplete("Let me help you with a demo response!")
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error("Error stopping speech recognition:", e)
        setIsListening(false)
      }
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
    } else if (!isProcessing) {
      if (speechSupported) {
        startListening()
      } else {
        // Demo mode - just provide a response
        setIsProcessing(true)
        setTimeout(() => {
          handleUserSpeechComplete("Hello! This is a demo response since speech recognition isn't available.")
        }, 500)
      }
    }
  }

  // Handle transcript updates
  useEffect(() => {
    if (userTranscript && !isListening) {
      setLastUserInput(userTranscript)
    }
  }, [userTranscript, isListening])

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
                ? "Thinking..."
                : isSpeaking
                  ? "Speaking..."
                  : isListening
                    ? "I'm listening..."
                    : speechSupported
                      ? "Tap mic to chat"
                      : "Tap mic for demo"}
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
              <p className="text-white/80 text-sm">
                {isProcessing
                  ? "Generating response..."
                  : isSpeaking
                    ? "AI is speaking..."
                    : "Ready to chat! Tap the microphone to hear from me."}
              </p>
            </div>
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
                setLastUserInput("")
                setUserTranscript("")
                setResponseCount(0)
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
                    : isListening
                      ? "bg-red-500 hover:bg-red-600 text-white"
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
