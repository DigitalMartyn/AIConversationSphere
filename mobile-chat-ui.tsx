"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, X, Settings, Send, MicOff, Info, Volume2 } from "lucide-react"

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
  const [showTextInput, setShowTextInput] = useState(true) // Default to text input
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [microphoneWorking, setMicrophoneWorking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isTestingMic, setIsTestingMic] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<any>(null)
  const analyserRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Add debug message
  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const debugMessage = `[${timestamp}] ${message}`
    console.log(debugMessage)
    setDebugInfo((prev) => [...prev.slice(-9), debugMessage]) // Keep last 10 messages
  }

  // Test microphone with multiple detection methods
  const testMicrophone = async () => {
    if (isTestingMic) {
      // Stop testing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      setIsTestingMic(false)
      setAudioLevel(0)
      addDebugMessage("Microphone test stopped")
      return
    }

    try {
      addDebugMessage("🎤 Starting microphone test...")
      setIsTestingMic(true)

      // Request microphone access with explicit constraints
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
        video: false,
      }

      addDebugMessage(`Requesting microphone with constraints: ${JSON.stringify(constraints)}`)

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      addDebugMessage("✅ Microphone stream obtained")

      // Log stream details
      const audioTracks = stream.getAudioTracks()
      addDebugMessage(`Audio tracks: ${audioTracks.length}`)
      if (audioTracks.length > 0) {
        const track = audioTracks[0]
        addDebugMessage(`Track label: ${track.label}`)
        addDebugMessage(`Track enabled: ${track.enabled}`)
        addDebugMessage(`Track ready state: ${track.readyState}`)
        addDebugMessage(`Track settings: ${JSON.stringify(track.getSettings())}`)
      }

      // Create audio context for real-time monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      addDebugMessage(`Audio context created, state: ${audioContext.state}`)

      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume()
        addDebugMessage(`Audio context resumed, new state: ${audioContext.state}`)
      }

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser

      // Configure analyser for maximum sensitivity
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)

      addDebugMessage(
        `Analyser configured - fftSize: ${analyser.fftSize}, frequencyBinCount: ${analyser.frequencyBinCount}`,
      )

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // Real-time audio level monitoring with multiple methods
      const updateAudioLevel = () => {
        if (!isTestingMic || !analyserRef.current) return

        // Method 1: Frequency domain analysis
        analyser.getByteFrequencyData(dataArray)
        const frequencyLevel = Math.max(...dataArray)

        // Method 2: Time domain analysis
        const timeDataArray = new Uint8Array(bufferLength)
        analyser.getByteTimeDomainData(timeDataArray)

        // Calculate RMS from time domain
        let sum = 0
        for (let i = 0; i < timeDataArray.length; i++) {
          const sample = (timeDataArray[i] - 128) / 128
          sum += sample * sample
        }
        const rms = Math.sqrt(sum / timeDataArray.length)
        const timeLevel = Math.floor(rms * 255)

        // Use the higher of the two methods
        const currentLevel = Math.max(frequencyLevel, timeLevel)

        setAudioLevel(currentLevel)

        // Log levels periodically for debugging
        if (Math.random() < 0.1) {
          // 10% chance to log
          addDebugMessage(`Audio levels - Frequency: ${frequencyLevel}, Time: ${timeLevel}, Final: ${currentLevel}`)
        }

        if (currentLevel > 1) {
          // Very low threshold
          setMicrophoneWorking(true)
          addDebugMessage(`Audio detected! Level: ${currentLevel}`)
        }

        requestAnimationFrame(updateAudioLevel)
      }

      updateAudioLevel()
      addDebugMessage("🔊 Microphone test started - speak to see audio levels")
      addDebugMessage("Audio monitoring loop started with dual detection methods")
    } catch (error) {
      addDebugMessage(`❌ Microphone test failed: ${error.message}`)
      addDebugMessage(`Error name: ${error.name}`)
      addDebugMessage(`Error stack: ${error.stack}`)
      setIsTestingMic(false)
      alert(`Microphone access failed: ${error.message}`)
    }
  }

  // Force enable speech recognition (skip microphone test)
  const forceEnableSpeechRecognition = () => {
    addDebugMessage("Force enabling speech recognition...")
    setSpeechRecognitionSupported(true)
    setMicrophoneWorking(true)
    setShowTextInput(false)
    addDebugMessage("Speech recognition force enabled - microphone issues bypassed")
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

    // Check for speech recognition support (but don't enable it yet)
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        addDebugMessage("SpeechRecognition API found")
      } else {
        addDebugMessage("Speech recognition not supported in this browser")
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
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

  const enableSpeechRecognition = () => {
    if (!microphoneWorking) {
      alert("Please test your microphone first to ensure it's working properly.")
      return
    }

    addDebugMessage("Enabling speech recognition...")
    setSpeechRecognitionSupported(true)
    setShowTextInput(false)
    addDebugMessage("Speech recognition enabled - you can now use the microphone button")
  }

  const startListening = async () => {
    if (!speechRecognitionSupported) {
      alert("Please enable speech recognition first.")
      return
    }

    addDebugMessage("=== Starting speech recognition ===")

    if (!isListening && !isSpeaking && !isProcessing) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        // Use minimal configuration
        recognition.continuous = false
        recognition.interimResults = true

        recognition.onstart = () => {
          addDebugMessage("✅ Speech recognition started")
          setIsListening(true)
          setCurrentTranscript("")
        }

        recognition.onresult = (event) => {
          let transcript = ""
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            addDebugMessage(`Result ${i}: "${event.results[i][0].transcript}"`)
          }
          setCurrentTranscript(transcript)
          if (transcript.trim()) {
            setInputMessage(transcript.trim())
          }
        }

        recognition.onend = () => {
          addDebugMessage("Speech recognition ended")
          setIsListening(false)
          if (currentTranscript.trim() || inputMessage.trim()) {
            const finalText = currentTranscript.trim() || inputMessage.trim()
            setTimeout(() => sendMessage(finalText), 500)
          }
        }

        recognition.onerror = (event) => {
          addDebugMessage(`Speech recognition error: ${event.error}`)
          addDebugMessage(`Error details: ${JSON.stringify(event)}`)
          setIsListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
      } catch (error) {
        addDebugMessage(`Failed to start recognition: ${error}`)
        alert("Speech recognition failed. Please use text input.")
      }
    }
  }

  const stopListening = () => {
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
                    : "AI Chat Assistant"}
            </h1>

            {/* Microphone Test Section */}
            {!microphoneWorking && (
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg px-4 py-3 mt-4 max-w-md">
                <p className="text-white text-sm mb-3">🎤 Test your microphone:</p>
                <div className="space-y-2">
                  <Button
                    onClick={testMicrophone}
                    className={`w-full ${isTestingMic ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                  >
                    {isTestingMic ? "Stop Test" : "Test Microphone"}
                  </Button>
                  <Button onClick={forceEnableSpeechRecognition} className="w-full bg-orange-500 hover:bg-orange-600">
                    Skip Test & Try Speech Recognition
                  </Button>
                </div>
                {isTestingMic && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-white" />
                      <div className="flex-1 bg-white/20 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white">{audioLevel}/255</span>
                    </div>
                    <p className="text-xs text-white/80 mt-1">Speak loudly to see audio levels</p>
                  </div>
                )}
              </div>
            )}

            {/* Enable Speech Recognition */}
            {microphoneWorking && !speechRecognitionSupported && (
              <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-3 mt-4 max-w-md">
                <p className="text-white text-sm mb-3">✅ Microphone working! Enable speech recognition:</p>
                <Button onClick={enableSpeechRecognition} className="w-full bg-green-500 hover:bg-green-600">
                  Enable Speech Recognition
                </Button>
              </div>
            )}

            {/* Speech Recognition Ready */}
            {speechRecognitionSupported && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-4 py-3 mt-4 max-w-md">
                <p className="text-white text-sm">🎤 Speech recognition ready! Click the microphone button to speak.</p>
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
