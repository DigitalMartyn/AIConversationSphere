"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, X, Keyboard, Send, MicOff, Info } from "lucide-react"

interface MobileChatUIProps {
  children: React.ReactNode
}

export default function MobileChatUI({ children }: MobileChatUIProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [lastResponse, setLastResponse] = useState("")
  const [inputMessage, setInputMessage] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Add debug message
  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const debugMessage = `[${timestamp}] ${message}`
    console.log(debugMessage)
    setDebugInfo((prev) => [...prev.slice(-9), debugMessage]) // Keep last 10 messages
  }

  // Initialize audio element
  useEffect(() => {
    addDebugMessage("Starting initialization...")
    addDebugMessage(`Browser: ${navigator.userAgent}`)
    addDebugMessage(`MediaRecorder supported: ${typeof MediaRecorder !== "undefined"}`)

    // Initialize audio element
    audioRef.current = new Audio()

    audioRef.current.onplay = () => {
      console.log("🎵 Audio started playing - setting isSpeaking to true")
      setIsSpeaking(true)
      setIsProcessing(false)
    }

    audioRef.current.onended = () => {
      console.log("🎵 Audio ended - setting isSpeaking to false")
      setIsSpeaking(false)
    }

    audioRef.current.onpause = () => {
      console.log("🎵 Audio paused - setting isSpeaking to false")
      setIsSpeaking(false)
    }

    audioRef.current.onerror = (error) => {
      console.error("Audio playback error:", error)
      setIsSpeaking(false)
      setIsProcessing(false)
      fallbackToSpeechSynthesis()
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
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
        console.log("🗣️ Speech synthesis started - setting isSpeaking to true")
        setIsSpeaking(true)
        setIsProcessing(false)
      }

      utterance.onend = () => {
        console.log("🗣️ Speech synthesis ended - setting isSpeaking to false")
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

  const startRecording = async () => {
    if (isRecording || isSpeaking || isProcessing) return

    try {
      addDebugMessage("🎤 Starting audio recording...")

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream
      audioChunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        addDebugMessage("Recording stopped, processing audio...")
        setIsRecording(false)
        setRecordingTime(0)

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        addDebugMessage(`Audio blob created, size: ${audioBlob.size} bytes`)

        // Send to Whisper API for transcription
        await transcribeAudio(audioBlob)

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        addDebugMessage(`MediaRecorder error: ${event.error}`)
        setIsRecording(false)
        setRecordingTime(0)
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      addDebugMessage("✅ Recording started successfully")
    } catch (error) {
      addDebugMessage(`❌ Failed to start recording: ${error.message}`)
      alert(`Microphone access failed: ${error.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      addDebugMessage("Stopping recording...")
      mediaRecorderRef.current.stop()
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      addDebugMessage("Sending audio to Whisper API...")

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/whisper", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`)
      }

      const data = await response.json()
      const transcript = data.text?.trim()

      if (transcript) {
        addDebugMessage(`Transcript received: "${transcript}"`)
        setInputMessage(transcript)
        await sendMessage(transcript)
      } else {
        addDebugMessage("No transcript received")
        alert("Could not understand the audio. Please try again or use text input.")
        setIsProcessing(false)
      }
    } catch (error) {
      addDebugMessage(`Transcription error: ${error.message}`)
      alert(`Speech-to-text failed: ${error.message}`)
      setIsProcessing(false)
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
    } else if (isRecording) {
      stopRecording()
    } else {
      startRecording()
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
    stopSpeaking()
    if (isRecording) {
      stopRecording()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">
        {React.Children.map(children, (child) => {
          console.log("🟡 Passing isSpeaking to child:", isSpeaking)
          if (React.isValidElement(child)) {
            // Force a key change when isSpeaking changes to ensure re-render
            return React.cloneElement(child as React.ReactElement<any>, {
              isSpeaking: isSpeaking,
              key: `sphere-${isSpeaking ? "speaking" : "silent"}`,
            })
          }
          return child
        })}
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
            <h1 className="text-xl font-medium text-white mb-4 drop-shadow-lg tracking-wide">
              {isProcessing
                ? "Thinking..."
                : isSpeaking
                  ? "Speaking..."
                  : isRecording
                    ? "I'm listening"
                    : "How can I help you today?"}
            </h1>
            {/* Add debug info */}
            <p className="text-white/60 text-xs">
              Debug: isSpeaking={isSpeaking.toString()}, isProcessing={isProcessing.toString()}
            </p>

            {/* Recording Status - Removed */}

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
                    : isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "hover:bg-white/20 text-white"
              }`}
              disabled={isProcessing}
              onClick={handleMicClick}
            >
              {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-round w-12 h-12 hover:bg-white/20 text-white ${showTextInput ? "bg-white/20" : ""}`}
              onClick={toggleTextInput}
            >
              <Keyboard className="w-6 h-6" />
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
