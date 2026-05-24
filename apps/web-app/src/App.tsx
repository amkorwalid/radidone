import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_IMAGE_URL =
  'https://github.com/user-attachments/assets/cffa782f-4c85-44bf-a033-1a9e7daa97e1'

type SenderRole = 'student' | 'mentor'

type ConversationTurn = {
  id: number
  senderRole: SenderRole
  messageText?: string | null
  createdAt?: string
}

type LogEntry = {
  time: string
  message: string
}

const apiBaseUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:8000'

function App() {
  const [apiToken, setApiToken] = useState(
    () => window.localStorage.getItem('radidone.token') ?? ''
  )
  const [sessionMode, setSessionMode] = useState<'guided' | 'assessment'>(
    'guided'
  )
  const [sessionId, setSessionId] = useState('')
  const [imageId, setImageId] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(DEFAULT_IMAGE_URL)
  const imagePreviewRef = useRef<string | null>(null)
  const [analysisJson, setAnalysisJson] = useState<Record<string, unknown> | null>(
    null
  )
  const [reportDraft, setReportDraft] = useState<Record<string, unknown> | null>(
    null
  )
  const [annotationType, setAnnotationType] = useState('polygon')
  const [annotationLabel, setAnnotationLabel] = useState('')
  const [annotationGeometry, setAnnotationGeometry] = useState(
    '{"points": [[120, 240], [180, 220], [210, 260]]}'
  )
  const [activeTab, setActiveTab] = useState<'analysis' | 'report'>('analysis')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ConversationTurn[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [voiceFile, setVoiceFile] = useState<File | null>(null)

  useEffect(() => {
    window.localStorage.setItem('radidone.token', apiToken)
  }, [apiToken])

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current)
      }
    }
  }, [])

  const appendLog = (message: string) => {
    const time = new Date().toLocaleTimeString()
    setLogEntries((prev) => [{ time, message }, ...prev].slice(0, 6))
  }

  const requestJson = async <T,>(path: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(apiToken ? { Authorization: 'Bearer ' + apiToken } : {}),
      ...(options.headers ?? {}),
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || response.statusText)
    }

    if (response.status === 204) {
      return null as T
    }

    return (await response.json()) as T
  }

  const handleImageSelection = (file: File | null) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current)
    }

    if (file) {
      const previewUrl = URL.createObjectURL(file)
      imagePreviewRef.current = previewUrl
      setImagePreview(previewUrl)
    } else {
      imagePreviewRef.current = null
      setImagePreview(DEFAULT_IMAGE_URL)
    }

    setImageFile(file)
  }

  const handleCreateSession = async () => {
    try {
      setIsBusy(true)
      const payload: { mode: string; xrayImageId?: number } = {
        mode: sessionMode,
      }
      if (imageId) {
        payload.xrayImageId = Number(imageId)
      }
      const session = await requestJson<{ id: number }>(`/api/sessions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSessionId(String(session.id))
      appendLog(`Session ${session.id} created (${sessionMode}).`)
    } catch (error) {
      appendLog(`Session error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleUploadImage = async () => {
    if (!imageFile) {
      appendLog('Select an X-ray image before uploading.')
      return
    }
    if (!sessionId) {
      appendLog('Enter or create a session before uploading.')
      return
    }

    try {
      setIsBusy(true)
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('sessionId', sessionId)
      const response = await requestJson<{ id: number }>(`/api/images`, {
        method: 'POST',
        body: formData,
      })
      setImageId(String(response.id))
      appendLog(`Image uploaded (id ${response.id}).`)
    } catch (error) {
      appendLog(`Upload error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleFetchAnalysis = async () => {
    if (!imageId) {
      appendLog('Provide an image ID before fetching analysis.')
      return
    }

    try {
      setIsBusy(true)
      const response = await requestJson<{ analysisJson: Record<string, unknown> }>(
        `/api/images/${imageId}/results`
      )
      setAnalysisJson(response.analysisJson)
      appendLog(`Analysis results loaded for image ${imageId}.`)
    } catch (error) {
      appendLog(`Analysis error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleFetchReport = async () => {
    if (!sessionId) {
      appendLog('Provide a session ID before fetching a report.')
      return
    }

    try {
      setIsBusy(true)
      const response = await requestJson<Record<string, unknown>>(
        `/api/sessions/${sessionId}/report`
      )
      setReportDraft(response)
      appendLog(`Session report loaded for ${sessionId}.`)
    } catch (error) {
      appendLog(`Report error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreateAnnotation = async () => {
    if (!imageId) {
      appendLog('Provide an image ID before saving annotations.')
      return
    }

    try {
      setIsBusy(true)
      const geometry = JSON.parse(annotationGeometry) as Record<string, unknown>
      await requestJson(`/api/images/${imageId}/annotations`, {
        method: 'POST',
        body: JSON.stringify({
          type: annotationType,
          geometry,
          findingLabel: annotationLabel || undefined,
        }),
      })
      appendLog('Annotation saved.')
    } catch (error) {
      appendLog(`Annotation error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleLoadChat = async () => {
    if (!sessionId) {
      appendLog('Provide a session ID to load conversation turns.')
      return
    }

    try {
      setIsBusy(true)
      const response = await requestJson<ConversationTurn[]>(
        `/api/sessions/${sessionId}/conversations`
      )
      setChatMessages(response)
      appendLog(`Loaded ${response.length} conversation turns.`)
    } catch (error) {
      appendLog(`Conversation error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleSendMessage = async () => {
    if (!sessionId) {
      appendLog('Provide a session ID before sending chat.')
      return
    }
    if (!chatInput.trim()) {
      appendLog('Enter a chat message to send.')
      return
    }

    try {
      setIsBusy(true)
      const response = await requestJson<ConversationTurn>(
        `/api/sessions/${sessionId}/conversations`,
        {
          method: 'POST',
          body: JSON.stringify({
            senderRole: 'student',
            messageText: chatInput.trim(),
          }),
        }
      )
      setChatMessages((prev) => [response, ...prev])
      setChatInput('')
      appendLog('Chat message sent.')
    } catch (error) {
      appendLog(`Chat error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleSendVoice = async () => {
    if (!sessionId) {
      appendLog('Provide a session ID before sending voice input.')
      return
    }
    if (!voiceFile) {
      appendLog('Select an audio file to submit.')
      return
    }

    try {
      setIsBusy(true)
      const formData = new FormData()
      formData.append('audio', voiceFile)
      await requestJson(`/api/sessions/${sessionId}/voice`, {
        method: 'POST',
        body: formData,
      })
      appendLog('Voice clip submitted for transcription.')
    } catch (error) {
      appendLog(`Voice error: ${(error as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const analysisPreview = useMemo(() => {
    if (!analysisJson) {
      return 'No AI analysis loaded yet. Use “Fetch Analysis” to view results.'
    }
    return JSON.stringify(analysisJson, null, 2)
  }, [analysisJson])

  const reportPreview = useMemo(() => {
    if (!reportDraft) {
      return 'Generate a report draft from the current session.'
    }
    return JSON.stringify(reportDraft, null, 2)
  }, [reportDraft])

  return (
    <div className="app">
      <header className="top-bar">
        <div>
          <div className="brand">Radidone</div>
          <div className="subtitle">Minimalist session dashboard</div>
        </div>
        <div className="top-actions">
          <div className="field">
            <label>API Token</label>
            <input
              type="password"
              placeholder="******"
              value={apiToken}
              onChange={(event) => setApiToken(event.target.value)}
            />
          </div>
          <div className="field">
            <label>Session Mode</label>
            <select
              value={sessionMode}
              onChange={(event) =>
                setSessionMode(event.target.value as 'guided' | 'assessment')
              }
            >
              <option value="guided">Guided</option>
              <option value="assessment">Assessment</option>
            </select>
          </div>
          <button
            className="primary"
            type="button"
            onClick={handleCreateSession}
            disabled={isBusy}
          >
            Start Session
          </button>
        </div>
      </header>

      <section className="control-bar">
        <div className="control-group">
          <div className="field">
            <label>Session ID</label>
            <input
              type="text"
              placeholder="e.g. 142"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            />
          </div>
          <div className="field">
            <label>Image ID</label>
            <input
              type="text"
              placeholder="e.g. 77"
              value={imageId}
              onChange={(event) => setImageId(event.target.value)}
            />
          </div>
        </div>
        <div className="control-group">
          <label className="file-label">
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleImageSelection(
                  event.target.files ? event.target.files[0] : null
                )
              }
            />
            Upload X-ray
          </label>
          <button type="button" onClick={handleUploadImage} disabled={isBusy}>
            Send Image
          </button>
          <button type="button" onClick={handleFetchAnalysis} disabled={isBusy}>
            Fetch Analysis
          </button>
          <button type="button" onClick={handleFetchReport} disabled={isBusy}>
            Fetch Report
          </button>
        </div>
      </section>

      <main className="layout">
        <section className="panel viewer">
          <div className="toolstrip">
            <button type="button">Zoom +</button>
            <button type="button">Zoom -</button>
            <button type="button">Pan</button>
            <button type="button">Measure</button>
            <button type="button">Draw</button>
            <button type="button">Erase</button>
          </div>
          <div className="image-shell">
            <img src={imagePreview} alt="X-ray preview" />
          </div>
          <div className="annotation-block">
            <h3>Annotation Controls</h3>
            <div className="annotation-fields">
              <div className="field">
                <label>Type</label>
                <input
                  type="text"
                  value={annotationType}
                  onChange={(event) => setAnnotationType(event.target.value)}
                />
              </div>
              <div className="field">
                <label>Finding Label</label>
                <input
                  type="text"
                  placeholder="e.g. Impacted molar"
                  value={annotationLabel}
                  onChange={(event) => setAnnotationLabel(event.target.value)}
                />
              </div>
            </div>
            <div className="field full">
              <label>Geometry JSON</label>
              <textarea
                rows={3}
                value={annotationGeometry}
                onChange={(event) => setAnnotationGeometry(event.target.value)}
              />
            </div>
            <button
              className="primary"
              type="button"
              onClick={handleCreateAnnotation}
              disabled={isBusy}
            >
              Save Annotation
            </button>
          </div>
        </section>

        <section className="panel insights">
          <div className="tabs">
            <button
              type="button"
              className={activeTab === 'analysis' ? 'active' : ''}
              onClick={() => setActiveTab('analysis')}
            >
              Analysis Summary
            </button>
            <button
              type="button"
              className={activeTab === 'report' ? 'active' : ''}
              onClick={() => setActiveTab('report')}
            >
              Report Draft
            </button>
          </div>
          <div className="summary-card">
            <pre>{activeTab === 'analysis' ? analysisPreview : reportPreview}</pre>
          </div>

          <div className="chat-section">
            <div className="chat-header">
              <h3>Mentor Chat</h3>
              <button type="button" onClick={handleLoadChat} disabled={isBusy}>
                Refresh Transcript
              </button>
            </div>
            <div className="chat-log">
              {chatMessages.length === 0 ? (
                <div className="empty">No conversation yet.</div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${message.senderRole}`}
                  >
                    <div className="role">{message.senderRole}</div>
                    <div>{message.messageText ?? ''}</div>
                  </div>
                ))
              )}
            </div>
            <div className="suggestions">
              <span>Suggested prompts</span>
              <div className="chips">
                {[
                  'Draft findings report',
                  'Suggest diagnoses',
                  'Measure edentulous span',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setChatInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Ask Radidone a question…"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <button
                className="primary"
                type="button"
                onClick={handleSendMessage}
                disabled={isBusy}
              >
                Send
              </button>
            </div>
          </div>

          <div className="voice-section">
            <div className="voice-header">
              <h3>Voice Assistant</h3>
              <span>Upload audio to /api/sessions/:id/voice</span>
            </div>
            <div className="voice-controls">
              <input
                type="file"
                accept="audio/*"
                onChange={(event) =>
                  setVoiceFile(event.target.files ? event.target.files[0] : null)
                }
              />
              <button type="button" onClick={handleSendVoice} disabled={isBusy}>
                Send Voice
              </button>
            </div>
          </div>

          <div className="log-section">
            <h3>Service Log</h3>
            <ul>
              {logEntries.map((entry) => (
                <li key={`${entry.time}-${entry.message}`}>
                  <span>{entry.time}</span> {entry.message}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="disclaimer">
        For investigational use only. Consult a specialist.
      </footer>
    </div>
  )
}

export default App
