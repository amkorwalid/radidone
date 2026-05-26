import base64
import os
import sys
import tempfile
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from image_service.upload_image import upload as upload_image
from image_service.fetch_analysis import analyze_and_normalize
from image_service.normalize_analysis import normalize_analysis
from mentor_engine.prompt_builder import build_system_prompt
from mentor_engine.report_builder import build_report
from mentor_engine.mentors import deepseek_mentor
from voice_service.speech_to_text import speech_to_text_openai
from voice_service.text_to_speech import text_to_speech_openai

DEFAULT_USER_ID = 1
PHASE_SEQUENCE = ["observation", "hypothesis", "diagnosis", "reflection", "evaluation"]
STATIC_DIR = Path(__file__).resolve().parent / "static"
TTS_DIR = STATIC_DIR / "tts"
TTS_DIR.mkdir(parents=True, exist_ok=True)


class SessionStatus(str, Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class SessionPhase(str, Enum):
    observation = "observation"
    hypothesis = "hypothesis"
    diagnosis = "diagnosis"
    reflection = "reflection"
    evaluation = "evaluation"


class SessionMode(str, Enum):
    guided = "guided"
    assessment = "assessment"


class SenderRole(str, Enum):
    student = "student"
    mentor = "mentor"


class Session(BaseModel):
    id: int
    userId: int
    mode: SessionMode
    status: SessionStatus
    phase: SessionPhase
    startedAt: datetime
    endedAt: Optional[datetime] = None
    xrayImageId: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime


class CreateSessionRequest(BaseModel):
    mode: SessionMode
    xrayImageId: Optional[int] = None


class UpdateSessionRequest(BaseModel):
    status: Optional[SessionStatus] = None
    endedAt: Optional[datetime] = None


class SessionPhaseScore(BaseModel):
    phase: SessionPhase
    score: float
    feedback: Optional[str] = None


class SessionReport(BaseModel):
    sessionId: int
    summary: str
    score: float
    phases: List[SessionPhaseScore]


class PaginatedSessions(BaseModel):
    items: List[Session]
    limit: int
    offset: int
    total: int


class XrayImage(BaseModel):
    id: int
    sessionId: int
    userId: int
    uploadTime: datetime
    metadata: Optional[Dict[str, Any]] = None


class AIAnalysis(BaseModel):
    id: int
    xrayImageId: int
    analysisJson: Dict[str, Any]
    createdAt: datetime


class Annotation(BaseModel):
    id: int
    xrayImageId: int
    userId: int
    sessionId: int
    type: str
    geometry: Dict[str, Any]
    findingLabel: Optional[str] = None
    createdAt: datetime


class CreateAnnotationRequest(BaseModel):
    type: str
    geometry: Dict[str, Any]
    findingLabel: Optional[str] = None


class UpdateAnnotationRequest(BaseModel):
    type: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None
    findingLabel: Optional[str] = None


class ConversationTurn(BaseModel):
    id: int
    sessionId: int
    senderRole: SenderRole
    messageText: Optional[str] = None
    turnIndex: int
    createdAt: datetime


class CreateConversationTurnRequest(BaseModel):
    senderRole: SenderRole
    messageText: str


class AudioVoice(BaseModel):
    id: int
    sessionId: int
    userId: int
    conversationId: int
    transcriptText: Optional[str] = None
    createdAt: datetime


class MentorRequest(BaseModel):
    messageText: str
    inputMode: Optional[str] = "text"


class MentorSequenceItem(BaseModel):
    type: str
    value: Optional[str] = None
    function: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


class MentorSequence(BaseModel):
    sequence: List[MentorSequenceItem]


class MentorResponse(BaseModel):
    sessionId: int
    phase: SessionPhase
    studentTurn: ConversationTurn
    mentorTurn: ConversationTurn
    mentorSequence: MentorSequence
    transcriptText: Optional[str] = None
    audioUrls: Optional[List[str]] = None


class VoiceMentorResponse(BaseModel):
    audioVoice: AudioVoice
    mentorResponse: MentorResponse


class InMemoryStore:
    def __init__(self) -> None:
        self.sessions: Dict[int, Session] = {}
        self.images: Dict[int, XrayImage] = {}
        self.analyses: Dict[int, AIAnalysis] = {}
        self.annotations: Dict[int, Annotation] = {}
        self.conversations: Dict[int, List[ConversationTurn]] = {}
        self.audio: Dict[int, AudioVoice] = {}
        self.session_meta: Dict[int, Dict[str, Any]] = {}
        self.counters = {
            "session": 1,
            "image": 1,
            "analysis": 1,
            "annotation": 1,
            "conversation": 1,
            "audio": 1,
        }

    def _next_id(self, key: str) -> int:
        value = self.counters[key]
        self.counters[key] += 1
        return value

    def create_session(self, mode: SessionMode, xray_image_id: Optional[int]) -> Session:
        now = datetime.now(timezone.utc)
        session_id = self._next_id("session")
        session = Session(
            id=session_id,
            userId=DEFAULT_USER_ID,
            mode=mode,
            status=SessionStatus.active,
            phase=SessionPhase.observation,
            startedAt=now,
            endedAt=None,
            xrayImageId=xray_image_id,
            createdAt=now,
            updatedAt=now,
        )
        self.sessions[session_id] = session
        self.conversations[session_id] = []
        self.session_meta[session_id] = {}
        return session

    def update_session(self, session_id: int, update: UpdateSessionRequest) -> Session:
        session = self.sessions[session_id]
        data = session.dict()
        if update.status is not None:
            data["status"] = update.status
        if update.endedAt is not None:
            data["endedAt"] = update.endedAt
        data["updatedAt"] = datetime.now(timezone.utc)
        session = Session(**data)
        self.sessions[session_id] = session
        return session

    def create_image(self, session_id: int, metadata: Optional[Dict[str, Any]]) -> XrayImage:
        now = datetime.now(timezone.utc)
        image_id = self._next_id("image")
        image = XrayImage(
            id=image_id,
            sessionId=session_id,
            userId=DEFAULT_USER_ID,
            uploadTime=now,
            metadata=metadata,
        )
        self.images[image_id] = image
        session = self.sessions[session_id]
        self.sessions[session_id] = Session(**{**session.dict(), "xrayImageId": image_id, "updatedAt": now})
        return image

    def create_analysis(self, image_id: int, analysis_json: Dict[str, Any]) -> AIAnalysis:
        now = datetime.now(timezone.utc)
        analysis_id = self._next_id("analysis")
        analysis = AIAnalysis(
            id=analysis_id,
            xrayImageId=image_id,
            analysisJson=analysis_json,
            createdAt=now,
        )
        self.analyses[analysis_id] = analysis
        return analysis

    def create_annotation(self, session_id: int, image_id: int, payload: CreateAnnotationRequest) -> Annotation:
        now = datetime.now(timezone.utc)
        annotation_id = self._next_id("annotation")
        annotation = Annotation(
            id=annotation_id,
            xrayImageId=image_id,
            userId=DEFAULT_USER_ID,
            sessionId=session_id,
            type=payload.type,
            geometry=payload.geometry,
            findingLabel=payload.findingLabel,
            createdAt=now,
        )
        self.annotations[annotation_id] = annotation
        return annotation

    def update_annotation(self, annotation_id: int, payload: UpdateAnnotationRequest) -> Annotation:
        annotation = self.annotations[annotation_id]
        data = annotation.dict()
        if payload.type is not None:
            data["type"] = payload.type
        if payload.geometry is not None:
            data["geometry"] = payload.geometry
        if payload.findingLabel is not None:
            data["findingLabel"] = payload.findingLabel
        annotation = Annotation(**data)
        self.annotations[annotation_id] = annotation
        return annotation

    def create_conversation_turn(self, session_id: int, sender: SenderRole, message_text: str) -> ConversationTurn:
        now = datetime.now(timezone.utc)
        turn_id = self._next_id("conversation")
        turns = self.conversations.get(session_id, [])
        turn = ConversationTurn(
            id=turn_id,
            sessionId=session_id,
            senderRole=sender,
            messageText=message_text,
            turnIndex=len(turns),
            createdAt=now,
        )
        turns.append(turn)
        self.conversations[session_id] = turns
        return turn

    def create_audio_voice(self, session_id: int, conversation_id: int, transcript: Optional[str]) -> AudioVoice:
        now = datetime.now(timezone.utc)
        audio_id = self._next_id("audio")
        audio = AudioVoice(
            id=audio_id,
            sessionId=session_id,
            userId=DEFAULT_USER_ID,
            conversationId=conversation_id,
            transcriptText=transcript,
            createdAt=now,
        )
        self.audio[audio_id] = audio
        return audio


store = InMemoryStore()

app = FastAPI(title="Radidone Session Orchestrator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in os.getenv("RADIDONE_CORS_ORIGINS", "*").split(",") if origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def require_session(session_id: int) -> Session:
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def build_mock_analysis() -> Dict[str, Any]:
    return {
        "id": "mock-analysis",
        "version": "mock",
        "is_done": True,
        "error_status": False,
        "response_time": 0,
        "results": {
            "image_type": "panoramic",
            "tooth_results": {},
            "palate_results": [],
            "illness_pool": [],
            "implant_brands": [],
            "measurement_results": [],
        },
    }


def ensure_prompt(session_id: int, raw_analysis: Optional[Dict[str, Any]]) -> str:
    meta = store.session_meta.get(session_id, {})
    if meta.get("system_prompt"):
        return meta["system_prompt"]
    report_source = raw_analysis or build_mock_analysis()
    report_text = build_report(report_source)
    prompt = build_system_prompt(report_text)
    meta["report"] = report_text
    meta["system_prompt"] = prompt
    store.session_meta[session_id] = meta
    return prompt


def normalize_sequence(sequence: Dict[str, Any]) -> MentorSequence:
    if not isinstance(sequence, dict) or "sequence" not in sequence:
        return MentorSequence(sequence=[MentorSequenceItem(type="text", value=str(sequence))])
    items = []
    for item in sequence.get("sequence", []):
        items.append(MentorSequenceItem(**item))
    return MentorSequence(sequence=items)


def generate_mentor_sequence(system_prompt: str, user_message: str) -> MentorSequence:
    if os.getenv("DEEPSEEK_API_KEY"):
        try:
            return normalize_sequence(deepseek_mentor(system_prompt, user_message))
        except Exception:
            pass
    fallback = {
        "sequence": [
            {
                "type": "interaction",
                "function": "updateSummaryStats",
                "params": {"scope": "all", "show": True},
            },
            {
                "type": "text",
                "value": f"I heard: {user_message}. Let's stay in the current phase and focus on one area.",
            },
        ]
    }
    return normalize_sequence(fallback)


def sequence_to_text(sequence: MentorSequence) -> str:
    return " ".join([item.value for item in sequence.sequence if item.type == "text" and item.value])


def maybe_generate_audio(sequence: MentorSequence) -> List[str]:
    if os.getenv("RADIDONE_ENABLE_TTS", "false").lower() != "true":
        return []
    audio_urls = []
    for idx, item in enumerate(sequence.sequence):
        if item.type != "text" or not item.value:
            continue
        filename = f"mentor_{datetime.now(timezone.utc).timestamp()}_{idx}"
        try:
            path = text_to_speech_openai(item.value, filename, str(TTS_DIR))
            audio_urls.append(f"/static/tts/{Path(path).name}")
        except Exception:
            continue
    return audio_urls


def advance_phase(session: Session) -> Session:
    current = session.phase.value
    if current in PHASE_SEQUENCE:
        idx = PHASE_SEQUENCE.index(current)
        if idx < len(PHASE_SEQUENCE) - 1:
            next_phase = SessionPhase(PHASE_SEQUENCE[idx + 1])
            session = Session(**{**session.dict(), "phase": next_phase, "updatedAt": datetime.now(timezone.utc)})
            store.sessions[session.id] = session
    return session


def handle_student_message(session_id: int, message_text: str, transcript: Optional[str] = None) -> MentorResponse:
    session = require_session(session_id)
    student_turn = store.create_conversation_turn(session_id, SenderRole.student, message_text)
    prompt = ensure_prompt(session_id, store.session_meta.get(session_id, {}).get("analysis_raw"))
    mentor_sequence = generate_mentor_sequence(prompt, message_text)
    mentor_text = sequence_to_text(mentor_sequence)
    mentor_turn = store.create_conversation_turn(session_id, SenderRole.mentor, mentor_text)
    session = advance_phase(session)
    audio_urls = maybe_generate_audio(mentor_sequence)
    return MentorResponse(
        sessionId=session_id,
        phase=session.phase,
        studentTurn=student_turn,
        mentorTurn=mentor_turn,
        mentorSequence=mentor_sequence,
        transcriptText=transcript,
        audioUrls=audio_urls or None,
    )


@app.get("/api/sessions", response_model=PaginatedSessions)
def list_sessions(limit: int = 20, offset: int = 0) -> PaginatedSessions:
    sessions = list(store.sessions.values())
    total = len(sessions)
    items = sessions[offset : offset + limit]
    return PaginatedSessions(items=items, limit=limit, offset=offset, total=total)


@app.post("/api/sessions", response_model=Session, status_code=201)
def create_session(payload: CreateSessionRequest) -> Session:
    return store.create_session(payload.mode, payload.xrayImageId)


@app.get("/api/sessions/{session_id}", response_model=Session)
def get_session(session_id: int) -> Session:
    return require_session(session_id)


@app.patch("/api/sessions/{session_id}", response_model=Session)
def update_session(session_id: int, payload: UpdateSessionRequest) -> Session:
    require_session(session_id)
    return store.update_session(session_id, payload)


@app.get("/api/sessions/{session_id}/report", response_model=SessionReport)
def get_session_report(session_id: int) -> SessionReport:
    require_session(session_id)
    meta = store.session_meta.get(session_id, {})
    summary = meta.get("report", "Session report not available yet.")
    phases = [SessionPhaseScore(phase=SessionPhase(p), score=0.0) for p in PHASE_SEQUENCE]
    return SessionReport(sessionId=session_id, summary=summary, score=0.0, phases=phases)


@app.post("/api/images", response_model=XrayImage, status_code=201)
async def create_image(
    file: UploadFile = File(...),
    sessionId: int = Form(...),
    metadata: Optional[str] = Form(None),
) -> XrayImage:
    session = require_session(sessionId)
    meta_payload: Optional[Dict[str, Any]] = None
    if metadata:
        try:
            meta_payload = json.loads(metadata)
        except ValueError:
            meta_payload = {"raw": metadata}

    image = store.create_image(session.id, meta_payload)
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename or "upload").suffix) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    raw_analysis: Dict[str, Any]
    normalized: Dict[str, Any]
    if os.getenv("THAKAAMED_API_KEY") and os.getenv("THAKAAMED_API_BASE"):
        try:
            slug = upload_image(temp_path)
            raw_analysis, normalized = analyze_and_normalize(slug)
        except Exception:
            raw_analysis = build_mock_analysis()
            normalized = normalize_analysis(raw_analysis)
    else:
        raw_analysis = build_mock_analysis()
        normalized = normalize_analysis(raw_analysis)

    store.create_analysis(image.id, normalized)
    prompt = ensure_prompt(session.id, raw_analysis)
    meta = {**store.session_meta.get(session.id, {})}
    meta.update(
        {
            "analysis_raw": raw_analysis,
            "analysis_normalized": normalized,
            "system_prompt": prompt,
        }
    )
    store.session_meta[session.id] = meta
    return image


@app.get("/api/images/{image_id}", response_model=XrayImage)
def get_image(image_id: int) -> XrayImage:
    image = store.images.get(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image


@app.get("/api/images/{image_id}/results", response_model=AIAnalysis)
def get_image_results(image_id: int) -> AIAnalysis:
    for analysis in store.analyses.values():
        if analysis.xrayImageId == image_id:
            return analysis
    raise HTTPException(status_code=404, detail="Analysis not found")


@app.get("/api/images/{image_id}/annotations", response_model=List[Annotation])
def list_annotations(image_id: int) -> List[Annotation]:
    return [a for a in store.annotations.values() if a.xrayImageId == image_id]


@app.post("/api/images/{image_id}/annotations", response_model=Annotation, status_code=201)
def create_annotation(image_id: int, payload: CreateAnnotationRequest) -> Annotation:
    image = store.images.get(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return store.create_annotation(image.sessionId, image_id, payload)


@app.patch("/api/annotations/{annotation_id}", response_model=Annotation)
def update_annotation(annotation_id: int, payload: UpdateAnnotationRequest) -> Annotation:
    if annotation_id not in store.annotations:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return store.update_annotation(annotation_id, payload)


@app.delete("/api/annotations/{annotation_id}", status_code=204)
def delete_annotation(annotation_id: int) -> None:
    if annotation_id not in store.annotations:
        raise HTTPException(status_code=404, detail="Annotation not found")
    store.annotations.pop(annotation_id)
    return None


@app.get("/api/sessions/{session_id}/conversations", response_model=List[ConversationTurn])
def list_conversations(session_id: int) -> List[ConversationTurn]:
    require_session(session_id)
    return store.conversations.get(session_id, [])


@app.post("/api/sessions/{session_id}/conversations", response_model=ConversationTurn, status_code=201)
def create_conversation(session_id: int, payload: CreateConversationTurnRequest) -> ConversationTurn:
    require_session(session_id)
    return store.create_conversation_turn(session_id, payload.senderRole, payload.messageText)


@app.post("/api/sessions/{session_id}/mentor", response_model=MentorResponse)
def create_mentor_response(session_id: int, payload: MentorRequest) -> MentorResponse:
    require_session(session_id)
    return handle_student_message(session_id, payload.messageText)


@app.post("/api/sessions/{session_id}/voice", response_model=VoiceMentorResponse, status_code=201)
async def submit_voice(session_id: int, audio: UploadFile = File(...)) -> VoiceMentorResponse:
    require_session(session_id)
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(audio.filename or "audio").suffix) as tmp:
        tmp.write(await audio.read())
        temp_path = tmp.name

    transcript = None
    if os.getenv("OPENAI_API_KEY"):
        try:
            transcript = speech_to_text_openai(temp_path)
        except Exception:
            transcript = None

    mentor_response = handle_student_message(session_id, transcript or "Voice input received.", transcript)
    audio_voice = store.create_audio_voice(session_id, mentor_response.studentTurn.id, transcript)
    return VoiceMentorResponse(audioVoice=audio_voice, mentorResponse=mentor_response)


@app.websocket("/api/chat")
async def chat_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            session_id = payload.get("sessionId")
            message_text = payload.get("messageText")
            if not session_id or not message_text:
                await websocket.send_json({"error": "sessionId and messageText required"})
                continue
            response = handle_student_message(int(session_id), str(message_text))
            await websocket.send_json(jsonable_encoder(response))
    except WebSocketDisconnect:
        return


@app.websocket("/api/voice")
async def voice_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            session_id = payload.get("sessionId")
            audio_b64 = payload.get("audioBase64")
            filename = payload.get("filename", "voice.webm")
            if not session_id or not audio_b64:
                await websocket.send_json({"error": "sessionId and audioBase64 required"})
                continue
            audio_bytes = base64.b64decode(audio_b64)
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
                tmp.write(audio_bytes)
                temp_path = tmp.name
            transcript = None
            if os.getenv("OPENAI_API_KEY"):
                try:
                    transcript = speech_to_text_openai(temp_path)
                except Exception:
                    transcript = None
            response = handle_student_message(int(session_id), transcript or "Voice input received.", transcript)
            await websocket.send_json(jsonable_encoder(response))
    except WebSocketDisconnect:
        return
