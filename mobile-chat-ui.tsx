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
  const [speechSupported, setSpeechSupported] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  const aiResponses = [
    "That's interesting! Tell me more about that.",
    "I understand what you're saying. How can I help you with that?",
    "Thanks for sharing that with me. What would you like to know?",
    "I hear you! That sounds important to you.",
    "That's a great point. Let me think about how I can assist you.",
    "I appreciate you telling me that. What's your main question?",
    "Interesting perspective! How can I support you with this?",
    "I'm listening and I want to help. What do you need from me?",
  ]

  // Generate contextual response based on user input
  const generateContextualResponse = (userInput: string) => {
    const input = userInput.toLowerCase()

    if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
      return "Hello! It's great to hear from you. How can I help you today?"
    } else if (input.includes("help") || input.includes("assist")) {
      return "I'm here to help! What do you need assistance with?"
    } else if (input.includes("how are you") || input.includes("how's it going")) {
      return "I'm doing well, thank you for asking! How are you doing today?"
    } else if (input.includes("thank")) {
      return "You're very welcome! Is there anything else I can help you with?"
    } else if (input.includes("question") || input.includes("ask")) {
      return "I'd be happy to answer your question. What would you like to know?"
    } else if (input.includes("problem") || input.includes("issue")) {
      return "I understand you're facing a challenge. Let me see how I can help you solve this."
    } else if (input.includes("work") || input.includes("job")) {
      return "I can definitely help with work-related topics. What specifically are you working on?"
    } else if (input.includes("learn") || input.includes("teach")) {
      return "I love helping people learn! What subject or skill are you interested in?"
    } else {
      return aiResponses[Math.floor(Math.random() * aiResponses.length)]
    }
  }

  // Get the best supported language
  const getSupportedLanguage = () => {
    const userLang = navigator.language || "en-US"

    // Common language codes that are widely supported
    const supportedLanguages = [
      "en-US",
      "en-GB",
      "en-AU",
      "en-CA",
      "en-IN",
      "en-NZ",
      "en-ZA",
      "es-ES",
      "es-MX",
      "fr-FR",
      "de-DE",
      "it-IT",
      "pt-BR",
      "pt-PT",
      "ru-RU",
      "ja-JP",
      "ko-KR",
      "zh-CN",
      "zh-TW",
      "ar-SA",
      "hi-IN",
    ]

    // Try exact match first
    if (supportedLanguages.includes(userLang)) {
      return userLang
    }

    // Try language without region
    const langCode = userLang.split("-")[0]
    const fallbackLang = supportedLanguages.find((lang) => lang.startsWith(langCode))

    if (fallbackLang) {
      return fallbackLang
    }

    // Default to US English
    return "en-US"
  }

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

          // Configure recognition with better settings
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = true
          recognitionRef.current.maxAlternatives = 1

          // Use the best supported language
          const supportedLang = getSupportedLanguage()
          recognitionRef.current.lang = supportedLang
          console.log("Using speech recognition language:", supportedLang)

          recognitionRef.current.onstart = () => {
            console.log("Speech recognition started")
            setIsListening(true)
            setUserTranscript("")
            setSpeechSupported(true)
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

            setUserTranscript(transcript)
            console.log("Transcript:", transcript, "Final:", isFinal)
          }

          recognitionRef.current.onend = () => {
            console.log("Speech recognition ended")
            setIsListening(false)

            // Process the final transcript
            if (userTranscript.trim()) {
              setLastUserInput(userTranscript.trim())
              handleUserSpeechComplete(userTranscript.trim())
            }
          }

          recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)
            setIsProcessing(false)

            // Handle specific error types
            switch (event.error) {
              case "language-not-supported":
                console.log("Language not supported, trying fallback")
                // Try with a different language
                if (recognitionRef.current.lang !== "en-US") {
                  recognitionRef.current.lang = "en-US"
                  console.log("Switched to en-US, retrying...")
                } else {
                  setSpeechSupported(false)
                }
                break
              case "network":
                console.log("Network error - speech recognition may not be available")
                setSpeechSupported(false)
                break
              case "not-allowed":
                console.log("Microphone access denied")
                setSpeechSupported(false)
                break
              case "no-speech":
                console.log("No speech detected")
                break
              default:
                console.log("Speech recognition error:", event.error)
            }
          }

          recognitionRef.current.onnomatch = () => {
            console.log("No speech match found")
          }
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
    if (!transcript.trim()) return

    setIsProcessing(true)

    // Small delay to show processing state
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Generate AI response
    await speakAIResponse(transcript)
  }

  const fallbackToSpeechSynthesis = (text?: string) => {
    const responseText = text || generateContextualResponse(lastUserInput)

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(responseText)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8

      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Google") ||
          voice.name.includes("Microsoft") ||
          voice.name.includes("Alex") ||
          voice.name.includes("Samantha"),
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
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
    }
  }

  const speakAIResponse = async (userInput: string) => {
    if (!audioRef.current) return

    try {
      const responseText = generateContextualResponse(userInput)

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
    if (!speechSupported) {
      console.log("Speech recognition not supported")
      return
    }

    if (recognitionRef.current && !isListening && !isSpeaking && !isProcessing) {
      try {
        // Reset transcript before starting
        setUserTranscript("")
        recognitionRef.current.start()
      } catch (e) {
        console.error("Error starting speech recognition:", e)
        setSpeechSupported(false)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error("Error stopping speech recognition:", e)
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
    if (!speechSupported) {
      // If speech recognition isn't supported, just trigger a demo response
      setIsProcessing(true)
      setTimeout(() => {
        fallbackToSpeechSynthesis(
          "I'm sorry, speech recognition isn't supported in your browser, but I can still speak to you!",
        )
      }, 500)
      return
    }

    if (isSpeaking) {
      stopSpeaking()
    } else if (isListening) {
      stopListening()
    } else if (!isProcessing) {
      startListening()
    }
  }

  // Update transcript handling
  useEffect(() => {
    if (!isListening && userTranscript.trim() && userTranscript !== lastUserInput) {
      setLastUserInput(userTranscript.trim())
      handleUserSpeechComplete(userTranscript.trim())
    }
  }, [isListening, userTranscript])

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
              {!speechSupported
                ? "Tap mic for demo"
                : isProcessing
                  ? "Processing..."
                  : isSpeaking
                    ? "Speaking..."
                    : isListening
                      ? "I'm listening..."
                      : "Tap mic to speak"}
            </h1>

            {/* Show speech support warning */}
            {!speechSupported && (
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white text-sm">Speech recognition not available, but I can still respond!</p>
              </div>
            )}

            {/* Show user transcript while listening */}
            {isListening && userTranscript && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white text-sm">"{userTranscript}"</p>
              </div>
            )}

            {/* Show last user input */}
            {lastUserInput && !isListening && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white/80 text-sm">You said: "{lastUserInput}"</p>
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
                setLastUserInput("")
                setUserTranscript("")
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
