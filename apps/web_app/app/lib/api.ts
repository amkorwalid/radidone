export interface Session {
  id: number;
  userId: number;
  mode: "guided" | "assessment";
  status: string;
  phase: string;
  startedAt: string;
  endedAt?: string | null;
  xrayImageId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface XrayImage {
  id: number;
  sessionId: number;
  userId: number;
  uploadTime: string;
  metadata?: Record<string, unknown> | null;
}

export interface AIAnalysis {
  id: number;
  xrayImageId: number;
  analysisJson: Record<string, unknown>;
  createdAt: string;
}

export interface ConversationTurn {
  id: number;
  sessionId: number;
  senderRole: "student" | "mentor";
  messageText?: string | null;
  turnIndex: number;
  createdAt: string;
}

export interface MentorSequenceItem {
  type: "text" | "interaction";
  value?: string;
  function?: string;
  params?: Record<string, unknown>;
}

export interface MentorResponse {
  sessionId: number;
  phase: string;
  studentTurn: ConversationTurn;
  mentorTurn: ConversationTurn;
  mentorSequence: { sequence: MentorSequenceItem[] };
  transcriptText?: string | null;
  audioUrls?: string[] | null;
}

export interface AudioVoice {
  id: number;
  sessionId: number;
  userId: number;
  conversationId: number;
  transcriptText?: string | null;
  createdAt: string;
}

export interface VoiceMentorResponse {
  audioVoice: AudioVoice;
  mentorResponse: MentorResponse;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Request to ${path} failed with ${response.status}: ${error || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function createSession(mode: "guided" | "assessment"): Promise<Session> {
  return request<Session>("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export async function uploadImage(file: File, sessionId: number): Promise<XrayImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("sessionId", String(sessionId));
  return request<XrayImage>("/api/images", {
    method: "POST",
    body: form,
  });
}

export async function fetchAnalysis(imageId: number): Promise<AIAnalysis> {
  return request<AIAnalysis>(`/api/images/${imageId}/results`, {
    method: "GET",
  });
}

export async function sendMentorMessage(sessionId: number, messageText: string): Promise<MentorResponse> {
  return request<MentorResponse>(`/api/sessions/${sessionId}/mentor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageText }),
  });
}

export async function sendVoiceMessage(sessionId: number, audio: Blob): Promise<VoiceMentorResponse> {
  const form = new FormData();
  form.append("audio", audio, "voice.webm");
  return request<VoiceMentorResponse>(`/api/sessions/${sessionId}/voice`, {
    method: "POST",
    body: form,
  });
}
