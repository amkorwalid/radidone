"use client";

import { useEffect, useRef, useState } from "react";
import { MdImage, MdUpload } from "react-icons/md";
import Image from "next/image";
import { toast } from "sonner";
import { AnnotationToolbar } from "../components/AnnotationToolbar";
import { ChatMessage } from "../components/ChatMessage";
import { ChatSkeleton, ImageUploadSkeleton } from "../components/LoadingIndicators";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { useAnnotationHistory } from "../components/useAnnotationHistory";
import {
  AIAnalysis,
  MentorResponse,
  MentorSequenceItem,
  createSession,
  fetchAnalysis,
  sendMentorMessage,
  sendVoiceMessage,
  uploadImage,
} from "../lib/api";

interface Message {
  id: string;
  text: string;
  sender: "mentor" | "student";
  timestamp: string;
  isLoading?: boolean;
}

interface CanvasState {
  toothPolygons?: Record<string, unknown> | null;
  boundingBoxes?: Record<string, unknown> | null;
  palateRegions?: Record<string, unknown> | null;
  transform?: Record<string, unknown> | null;
  illnessFilter?: string | null;
  severityFilter?: Record<string, boolean> | null;
  quadrant?: string | null;
  illnessPoolVisible?: boolean;
  toothTooltip?: string | null;
  toothPanel?: { toothId: string; section?: string } | null;
  croppedImage?: { toothId: string; mode?: string } | null;
  summaryStats?: { scope?: string; show?: boolean } | null;
}

interface CanvasEvent {
  id: string;
  action: string;
  params?: Record<string, unknown>;
}

interface AnalysisSummary {
  teeth?: {
    present?: number;
  };
}

const initialCanvasState: CanvasState = {
  illnessPoolVisible: false,
};

export default function Dashboard() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi, I'm Radidone, your dental radiology mentor. Upload an X-ray and start a session to begin.",
      sender: "mentor",
      timestamp: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("observation");
  const [canvasState, setCanvasState] = useState<CanvasState>(initialCanvasState);
  const [canvasEvents, setCanvasEvents] = useState<CanvasEvent[]>([]);
  const [selectedTool, setSelectedTool] = useState("polygon");
  const [layerVisible, setLayerVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { undo, redo, clear, canUndo, canRedo } = useAnnotationHistory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const logCanvasEvent = (action: string, params?: Record<string, unknown>) => {
    setCanvasEvents((prev) => [
      ...prev,
      { id: `${Date.now()}-${action}`, action, params },
    ].slice(-6));
  };

  const dispatchCanvasAction = (item: MentorSequenceItem) => {
    if (!item.function) {
      return;
    }
    logCanvasEvent(item.function, item.params);
    switch (item.function) {
      case "renderToothPolygons":
        setCanvasState((prev) => ({ ...prev, toothPolygons: item.params ?? {} }));
        break;
      case "renderBoundingBoxes":
        setCanvasState((prev) => ({ ...prev, boundingBoxes: item.params ?? {} }));
        break;
      case "renderPalateRegions":
        setCanvasState((prev) => ({ ...prev, palateRegions: item.params ?? {} }));
        break;
      case "setCanvasTransform":
        setCanvasState((prev) => ({ ...prev, transform: item.params ?? {} }));
        break;
      case "filterByIllness":
        setCanvasState((prev) => ({
          ...prev,
          illnessFilter: (item.params?.illnessName as string) ?? null,
        }));
        break;
      case "filterBySeverity":
        setCanvasState((prev) => ({
          ...prev,
          severityFilter: (item.params?.visible as Record<string, boolean>) ?? null,
        }));
        break;
      case "isolateQuadrant":
        setCanvasState((prev) => ({
          ...prev,
          quadrant: (item.params?.quadrant as string) ?? null,
        }));
        break;
      case "toggleIllnessPool":
        setCanvasState((prev) => ({
          ...prev,
          illnessPoolVisible: Boolean(item.params?.visible),
        }));
        break;
      case "showToothTooltip":
        setCanvasState((prev) => ({
          ...prev,
          toothTooltip: (item.params?.toothId as string) ?? null,
        }));
        break;
      case "openToothPanel":
        setCanvasState((prev) => ({
          ...prev,
          toothPanel: {
            toothId: item.params?.toothId as string,
            section: item.params?.section as string,
          },
        }));
        break;
      case "showCroppedImage":
        setCanvasState((prev) => ({
          ...prev,
          croppedImage: {
            toothId: item.params?.toothId as string,
            mode: item.params?.mode as string,
          },
        }));
        break;
      case "updateSummaryStats":
        setCanvasState((prev) => ({
          ...prev,
          summaryStats: {
            scope: item.params?.scope as string,
            show: Boolean(item.params?.show),
          },
        }));
        break;
      default:
        break;
    }
  };

  const applyMentorSequence = (sequence: MentorSequenceItem[]) => {
    sequence.forEach((item) => {
      if (item.type === "text" && item.value) {
        const mentorMessage: Message = {
          id: `${Date.now()}-${item.value.slice(0, 8)}`,
          text: item.value,
          sender: "mentor",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, mentorMessage]);
      }
      if (item.type === "interaction") {
        dispatchCanvasAction(item);
      }
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
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
    toast.success("Image ready for session");
  };

  const startSession = async () => {
    if (!image) {
      toast.error("Please upload an image first");
      return;
    }
    setIsSessionLoading(true);
    try {
      const session = await createSession("guided");
      setSessionId(session.id);
      setCurrentPhase(session.phase);
      const uploaded = await uploadImage(image, session.id);
      const analysisResult = await fetchAnalysis(uploaded.id);
      setAnalysis(analysisResult);
      toast.success(`Session started! Phase: ${session.phase}`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to start session. Check the backend configuration.");
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId) {
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
    try {
      const response: MentorResponse = await sendMentorMessage(sessionId, userMessage.text);
      setCurrentPhase(response.phase);
      applyMentorSequence(response.mentorSequence.sequence);
    } catch (error) {
      console.error(error);
      toast.error("Mentor response failed. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceRecord = async (blob: Blob) => {
    if (!sessionId) {
      toast.error("Start a session before sending voice input.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await sendVoiceMessage(sessionId, blob);
      const transcript = response.mentorResponse.transcriptText;
      if (transcript) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-voice`,
            text: transcript,
            sender: "student",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
      setCurrentPhase(response.mentorResponse.phase);
      applyMentorSequence(response.mentorResponse.mentorSequence.sequence);
    } catch (error) {
      console.error(error);
      toast.error("Voice message failed. Check audio permissions or backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const sessionActive = Boolean(sessionId);
  const analysisSummary = (analysis?.analysisJson as { summary?: AnalysisSummary })?.summary;

  return (
    <main className="min-h-screen bg-black">
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-white">Radidone</h1>
          </div>
          {sessionActive && (
            <div className="text-sm text-gray-400">Phase: {currentPhase}</div>
          )}
        </div>
      </header>

      <div className="p-6 h-[calc(100vh-5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            {sessionActive && imagePreview && (
              <AnnotationToolbar
                onToolChange={setSelectedTool}
                onUndo={undo}
                onRedo={redo}
                onClear={clear}
                onToggleLayer={() => setLayerVisible((prev) => !prev)}
                layerVisible={layerVisible}
                selectedTool={selectedTool}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            )}
            <div className="flex-1 bg-linear-to-br from-zinc-900 to-zinc-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
              {imagePreview ? (
                <div className="flex-1 overflow-auto relative">
                  <Image
                    src={imagePreview}
                    fill
                    alt="X-ray"
                    className="w-full p-8 object-contain"
                  />
                  {sessionActive && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg text-xs text-gray-300">
                      {layerVisible ? "Annotations visible" : "Annotations hidden"}
                    </div>
                  )}
                  {sessionActive && (
                    <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-2 rounded-lg text-xs text-gray-200 space-y-1">
                      {canvasState.illnessFilter && (
                        <div>Illness filter: {canvasState.illnessFilter}</div>
                      )}
                      {canvasState.quadrant && <div>Quadrant: {canvasState.quadrant}</div>}
                      {canvasState.toothPanel && (
                        <div>Tooth panel: {canvasState.toothPanel.toothId}</div>
                      )}
                      {analysisSummary && (
                        <div>
                          Teeth present: {analysisSummary.teeth?.present ?? "—"}
                        </div>
                      )}
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
            {sessionActive && canvasEvents.length > 0 && (
              <div className="bg-black border border-gray-800 rounded-lg p-3 text-xs text-gray-300">
                <div className="text-gray-400 mb-2">Canvas actions</div>
                <div className="space-y-1">
                  {canvasEvents.map((event) => (
                    <div key={event.id}>{event.action}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-linear-to-br from-zinc-900 to-zinc-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
              {sessionActive && imagePreview ? (
                <>
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

                  <div className="border-t border-gray-700 p-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type your response..."
                        className="flex-1 px-3 py-2 bg-zinc-800 text-white rounded-lg border border-gray-700 focus:border-white focus:outline-none transition-colors text-sm"
                        disabled={isLoading}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim()}
                        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Send
                      </button>
                    </div>
                    <VoiceRecorder onRecord={handleVoiceRecord} isLoading={isLoading} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MdImage className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Start a Session
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                      Upload an X-ray image and start a session to begin
                    </p>
                    <button
                      onClick={startSession}
                      disabled={isSessionLoading}
                      className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                    >
                      {isSessionLoading ? "Starting..." : "Start Session"}
                    </button>
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
