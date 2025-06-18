"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, X, Settings, Send, MicOff, Info } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

// Define the SpeechRecognition type for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
    AudioContext: any
    webkitAudioContext: any
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
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)

  // Add debug message
  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const debugMessage = `[${timestamp}] ${message}`
    console.log(debugMessage)
    setDebugInfo((prev) => [...prev.slice(-9), debugMessage]) // Keep last 10 messages
  }

  // Get available speech synthesis voices to infer supported languages
  const getAvailableLanguages = () => {
    if ("speechSynthesis" in window) {
      const voices = speechSynthesis.getVoices()
      const languages = [...new Set(voices.map((voice) => voice.lang))].sort()
      addDebugMessage(`Available TTS languages: ${languages.join(", ")}`)
      return languages
    }
    return []
  }

  // Check microphone permissions and audio levels
  const checkMicrophoneAccess = async () => {
    try {
      addDebugMessage("🎤 Checking microphone permissions...")

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      addDebugMessage("✅ Microphone permission granted")

      // Create audio context to check audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Check audio levels for 2 seconds
      let maxLevel = 0
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        const currentLevel = Math.max(...dataArray)
        maxLevel = Math.max(maxLevel, currentLevel)
      }

      const audioCheckInterval = setInterval(checkAudio, 100)

      setTimeout(() => {
        clearInterval(audioCheckInterval)
        addDebugMessage(`🔊 Max audio level detected: ${maxLevel}/255`)

        // Clean up
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()

        if (maxLevel < 10) {
          addDebugMessage("⚠️ Very low audio levels - microphone might not be working")
        } else {
          addDebugMessage("✅ Audio input is working")
        }
      }, 2000)

      return true
    } catch (error) {
      addDebugMessage(`❌ Microphone access failed: ${error.message}`)
      return false
    }
  }

  // Initialize audio element and speech recognition
  useEffect(() => {
    addDebugMessage("Starting initialization...")

    // Log browser information
    addDebugMessage(`Browser: ${navigator.userAgent}`)
    addDebugMessage(`Language: ${navigator.language}`)
    addDebugMessage(`Languages: ${navigator.languages?.join(", ") || "Not available"}`)
    addDebugMessage(`Platform: ${navigator.platform}`)
    addDebugMessage(`Online: ${navigator.onLine}`)

    // Wait for voices to load and then log available languages
    if ("speechSynthesis" in window) {
      const logVoices = () => {
        const languages = getAvailableLanguages()
        if (languages.length > 0) {
          addDebugMessage(`Found ${languages.length} TTS languages`)
        } else {
          addDebugMessage("No TTS languages found yet, will retry...")
          setTimeout(logVoices, 1000)
        }
      }

      if (speechSynthesis.getVoices().length > 0) {
        logVoices()
      } else {
        speechSynthesis.onvoiceschanged = logVoices
      }
    }

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

    // Initialize speech recognition with detailed debugging
    if (typeof window !== "undefined") {
      addDebugMessage("Checking for speech recognition support...")

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        addDebugMessage("SpeechRecognition API found!")

        try {
          recognitionRef.current = new SpeechRecognition()
          addDebugMessage("SpeechRecognition instance created successfully")

          // Log all available properties
          const recognition = recognitionRef.current
          addDebugMessage(`Recognition properties:`)
          addDebugMessage(`- continuous: ${recognition.continuous}`)
          addDebugMessage(`- interimResults: ${recognition.interimResults}`)
          addDebugMessage(`- lang: ${recognition.lang || "not set"}`)
          addDebugMessage(`- maxAlternatives: ${recognition.maxAlternatives || "not set"}`)
          addDebugMessage(`- serviceURI: ${recognition.serviceURI || "not set"}`)

          setSpeechRecognitionSupported(true)
          addDebugMessage("Speech recognition initialized successfully")
        } catch (error) {
          addDebugMessage(`Error initializing speech recognition: ${error}`)
          setSpeechRecognitionSupported(false)
        }
      } else {
        addDebugMessage("Speech recognition not supported in this browser")
        setSpeechRecognitionSupported(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          addDebugMessage(`Error stopping recognition: ${e}`)
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
    addDebugMessage(`Sending message: "${message}"`)

    try {
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

      addDebugMessage(`AI Response received: "${aiResponse}"`)
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
        addDebugMessage("TTS failed, using browser speech synthesis")
        fallbackToSpeechSynthesis(aiResponse)
      }
    } catch (error) {
      addDebugMessage(`Error: ${error}`)
      const fallbackText = "Sorry, I encountered an error while processing your message. Please try again."
      setLastResponse(fallbackText)
      fallbackToSpeechSynthesis(fallbackText)
    }
  }

  const startListening = async () => {
    addDebugMessage("=== TRYING PUSH-TO-TALK APPROACH ===")

    if (!speechRecognitionSupported) {
      addDebugMessage("Speech recognition not supported")
      alert("Speech recognition is not supported in your browser. Please use the text input instead.")
      return
    }

    // First check microphone access
    const micAccess = await checkMicrophoneAccess()
    if (!micAccess) {
      addDebugMessage("Cannot proceed without microphone access")
      alert("Microphone access is required for speech recognition. Please allow microphone permissions and try again.")
      return
    }

    if (recognitionRef.current && !isListening && !isSpeaking && !isProcessing) {
      try {
        addDebugMessage("=== Creating recognition with ZERO configuration ===")

        // Create the most basic possible recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        // Don't set ANY properties - use whatever the browser gives us
        addDebugMessage("Using completely default recognition settings")
        addDebugMessage(`Default lang: ${recognition.lang || "undefined"}`)

        let hasResult = false

        recognition.onstart = () => {
          addDebugMessage("✅ Recognition started successfully!")
          setIsListening(true)
          setCurrentTranscript("")
        }

        recognition.onresult = (event) => {
          addDebugMessage(`Got result! ${event.results.length} results`)
          hasResult = true

          let transcript = ""
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            addDebugMessage(`Result ${i}: "${event.results[i][0].transcript}"`)
          }

          setCurrentTranscript(transcript)
          if (transcript.trim()) {
            setInputMessage(transcript.trim())
            addDebugMessage(`Final transcript: "${transcript.trim()}"`)
          }
        }

        recognition.onend = () => {
          addDebugMessage("Recognition ended")
          setIsListening(false)

          if (hasResult && (currentTranscript.trim() || inputMessage.trim())) {
            const finalText = currentTranscript.trim() || inputMessage.trim()
            addDebugMessage(`Processing: "${finalText}"`)
            setTimeout(() => sendMessage(finalText), 500)
          } else {
            addDebugMessage("No results to process")
          }
        }

        recognition.onerror = (event) => {
          addDebugMessage(`ERROR: ${event.error}`)
          addDebugMessage(`Error details: ${JSON.stringify(event)}`)
          setIsListening(false)

          // Show user-friendly error
          if (event.error === "not-allowed") {
            alert("Microphone permission is required. Please allow access and try again.")
          } else if (event.error === "no-speech") {
            alert("No speech detected. Please try speaking again.")
          } else if (event.error === "audio-capture") {
            alert("Microphone not working. Please check your microphone and try again.")
          } else if (event.error === "network") {
            alert("Network error. Please check your internet connection.")
          } else {
            alert(`Speech recognition error: ${event.error}. Please try the text input instead.`)
          }
        }

        // Store the recognition instance
        recognitionRef.current = recognition
        setCurrentTranscript("")
        setInputMessage("")

        // Start recognition with no configuration at all
        addDebugMessage("🚀 Starting recognition with zero config...")
        recognition.start()
      } catch (error) {
        addDebugMessage(`Failed to create recognition: ${error}`)
        alert("Speech recognition failed to start. Please use text input instead.")
        setSpeechRecognitionSupported(false)
      }
    }
  }

  const stopListening = () => {
    addDebugMessage("Stopping speech recognition...")
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        addDebugMessage(`Error stopping speech recognition: ${error}`)
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
        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 z-20 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-semibold">Debug Info</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {debugInfo.map((info, index) => (
                <p key={index} className="text-xs text-green-400 font-mono">
                  {info}
                </p>
              ))}
            </div>
          </div>
        )}

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

            {speechRecognitionSupported && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-4 py-2 mt-4 max-w-md">
                <p className="text-white text-sm">🎤 Click microphone, speak clearly, then wait for processing</p>
              </div>
            )}

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
              className={`rounded-round w-12 h-12 hover:bg-white/20 text-white ${showTextInput ? "bg-white/20" : ""}`}
              onClick={toggleTextInput}
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Debug Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 rounded-full w-10 h-10 hover:bg-white/20 text-white z-10"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
