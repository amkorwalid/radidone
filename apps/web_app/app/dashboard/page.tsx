"use client";

import { useState, useRef, useEffect } from "react";
import { MdUpload, MdImage } from "react-icons/md";
import { toast } from "sonner";
import { ChatMessage } from "../components/ChatMessage";
import { AnnotationToolbar } from "../components/AnnotationToolbar";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { ChatSkeleton, ImageUploadSkeleton } from "../components/LoadingIndicators";
import Image from "next/image";

interface Message {
  id: string;
  text: string;
  sender: "mentor" | "student";
  timestamp: string;
  isLoading?: boolean;
}

export default function Dashboard() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [session, setSession] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi, I'm Radidone, your dental radiology mentor. I'll guide you through this X-ray analysis using the Socratic method. Let's start by identifying what you observe.",
      sender: "mentor",
      timestamp: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("Observation");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phases = [
    "Observation",
    "Hypothesis",
    "Diagnosis",
    "Reflection",
    "Evaluation",
  ];
  const currentPhaseIndex = phases.indexOf(currentPhase);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.success("Image uploaded successfully");
    }
  };

  const startSession = () => {
    if (!image) {
      toast.error("Please upload an image first");
      return;
    }
    setSession(true);
    toast.success("Session started! Phase: Observation");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "student",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate mentor response with loading indicator
    setTimeout(() => {
      const mentorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "That's a good observation. Based on the findings you've identified, what differential diagnoses would you consider for this condition?",
        sender: "mentor",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, mentorMessage]);
      setIsLoading(false);

      // Advance phase
      if (currentPhaseIndex < phases.length - 1) {
        setCurrentPhase(phases[currentPhaseIndex + 1]);
        toast.success(`Phase advanced to ${phases[currentPhaseIndex + 1]}`);
      }
    }, 2000);
  };

  const handleVoiceRecord = (blob: Blob) => {
    void blob;
    toast.success("Voice message recorded");
    // In a real app, send the audio blob to the backend for transcription
  };

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-white">Radidone</h1>
          </div>
          
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 h-[calc(100vh-5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Image and Annotation Panel */}
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
              {/* Annotation Toolbar */}
            {session && imagePreview && (
              <div>
                <AnnotationToolbar />
              </div>
            )}
            {/* Image Area */}
            <div className="flex-1 bg-linear-to-br from-zinc-900 to-zinc-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
              {imagePreview ? (
                <div className="flex-1 overflow-auto relative">
                  
                  <Image 
                    src={imagePreview} 
                    fill
                    alt="X-ray" 
                    className="w-full p-8 object-contain" />
                  {session && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg text-xs text-gray-300">
                      Annotations visible
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ImageUploadSkeleton />
                    <label
                      htmlFor="file-upload"
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all cursor-pointer"
                    >
                      <MdUpload className="h-5 w-5" />
                      Upload X-ray
                    </label>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat and Session Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-linear-to-br from-zinc-900 to-zinc-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
              {session && imagePreview ? (
                <>
                  {/* Phase Progress */}
                  {/* <div className="px-4 pt-4 pb-2 border-b border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Session Progress</div>
                    <div className="flex gap-1">
                      {phases.map((phase, index) => (
                        <div
                          key={phase}
                          className={`flex-1 h-1.5 rounded-full transition-colors ${
                            index <= currentPhaseIndex
                              ? "bg-blue-600"
                              : "bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div> */}

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <ChatSkeleton />
                    ) : (
                      messages.map((msg) => (
                        <ChatMessage
                          key={msg.id}
                          message={msg.text}
                          sender={msg.sender}
                          isLoading={msg.isLoading}
                        />
                      ))
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex gap-1 items-center p-2 rounded-lg bg-black text-white">
                          <div className="h-1 w-1 bg-white rounded-full animate-bounce"></div>
                          <div className="h-1 w-1 bg-white rounded-full animate-bounce delay-100"></div>
                          <div className="h-1 w-1 bg-white rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-700 p-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendMessage()
                        }
                        placeholder="Type your response..."
                        className="flex-1 px-3 py-2 bg-zinc-800 text-white rounded-lg border border-gray-700 focus:border-white focus:outline-none transition-colors text-sm"
                        disabled={isLoading}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                        className="px-4 py-2 bg-white text-black rounded-lg disabled:bg-zinc-800 disabled:text-white disabled:cursor-not-allowed transition-colors font-medium text-sm"
                      >
                        Send
                      </button>
                    </div>
                    <VoiceRecorder
                      onRecord={handleVoiceRecord}
                      isLoading={isLoading}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="h-16 w-16 bg-black rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <MdImage className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Ready to Start?
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload an X-ray to begin your learning session
                    </p>
                    {image && (
                      <button
                        onClick={startSession}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all font-medium"
                      >
                        Start Session
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
