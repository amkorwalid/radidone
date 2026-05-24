import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const phases = ['Observation', 'Hypothesis', 'Diagnosis', 'Reflection', 'Evaluation']

const phasePrompts = {
  Observation:
    'Describe the visible structures first. Call out notable anatomy, density changes, and anything that feels unusual.',
  Hypothesis:
    'Now narrow the differential. Which findings matter most, and what possibilities fit the pattern?',
  Diagnosis:
    'Choose the leading diagnosis and justify it with the evidence you can point to on the image.',
  Reflection:
    'Compare your answer with the image findings and explain anything you would revisit.',
  Evaluation:
    'Summarize the session outcome, including confidence, strengths, and the next step for review.',
}

const demoMentorReplies = {
  Observation:
    'Start with the mandibular molars and trace the bone contours. What pattern do you notice first?',
  Hypothesis:
    'That pattern could support a localized inflammatory change. What alternative would you rule out next?',
  Diagnosis:
    'You are close. State the primary diagnosis and mention the strongest supporting feature.',
  Reflection:
    'Good. Re-check the area you almost skipped and compare it with the contralateral side.',
  Evaluation:
    'The session is complete. Capture the key takeaway and what you would monitor on the next case.',
}

const initialLog = [
  {
    id: 1,
    title: 'Dashboard ready',
    detail: 'Use each card independently to test upload, session, and voice flows.',
    createdAt: new Date(),
  },
]

const formatTimestamp = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const createSessionId = () =>
  `RD-${Math.floor(Date.now() % 100000)
    .toString()
    .padStart(5, '0')}`

function App() {
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)
  const utteranceRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadStatus, setUploadStatus] = useState('No X-ray selected yet.')
  const [sessionMode, setSessionMode] = useState('guided')
  const [session, setSession] = useState(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [transcript, setTranscript] = useState('Say something to capture a voice note.')
  const [mentorReply, setMentorReply] = useState(demoMentorReplies.Observation)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [logs, setLogs] = useState(initialLog)

  const currentPhase = phases[phaseIndex]
  const apiBaseUrl = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL || '').trim(),
    [],
  )

  const pushLog = (title, detail) => {
    setLogs((entries) => [
      { id: Date.now() + Math.random(), title, detail, createdAt: new Date() },
      ...entries.slice(0, 5),
    ])
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (utteranceRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop?.()
      }
    }
  }, [])

  const voiceSupport = {
    recognition:
      typeof window !== 'undefined'
      && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    speech: typeof window !== 'undefined' && Boolean(window.speechSynthesis),
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)

    if (!file) {
      setUploadStatus('No X-ray selected yet.')
      pushLog('Upload cleared', 'Removed the current X-ray selection.')
      setPreviewUrl('')
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setUploadStatus(`Loaded ${file.name} for local testing.`)
    pushLog('X-ray loaded', `${file.name} is ready for upload testing.`)
  }

  const handleStartSession = () => {
    const nextSession = {
      id: createSessionId(),
      mode: sessionMode,
      phase: 'Observation',
      xray: selectedFile?.name || 'No image attached',
      startedAt: new Date(),
    }

    setSession(nextSession)
    setPhaseIndex(0)
    setTranscript('Say something to capture a voice note.')
    setMentorReply(demoMentorReplies.Observation)
    pushLog('Session started', `Created ${nextSession.id} in ${sessionMode} mode.`)
  }

  const handleAdvancePhase = () => {
    setPhaseIndex((index) => {
      const nextIndex = (index + 1) % phases.length
      setMentorReply(demoMentorReplies[phases[nextIndex]])
      pushLog('Phase advanced', `Moved to ${phases[nextIndex]} testing.`)
      if (session) {
        setSession((current) =>
          current ? { ...current, phase: phases[nextIndex] } : current,
        )
      }
      return nextIndex
    })
  }

  const handleUseSampleReply = () => {
    setMentorReply(demoMentorReplies[currentPhase])
    pushLog('Mentor reply reset', `Loaded the ${currentPhase.toLowerCase()} prompt.`)
  }

  const handleSpeakReply = () => {
    if (!voiceSupport.speech) {
      pushLog('Voice output unavailable', 'This browser does not support speech synthesis.')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(mentorReply)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)

    utteranceRef.current = utterance
    setIsSpeaking(true)
    pushLog('Voice output started', 'Speaking the current mentor response.')
    window.speechSynthesis.speak(utterance)
  }

  const handleToggleRecognition = () => {
    if (!voiceSupport.recognition) {
      pushLog('Voice input unavailable', 'This browser does not support speech recognition.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop?.()
      return
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Recognition()

    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim()

      if (spokenText) {
        setTranscript(spokenText)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      pushLog('Voice input stopped', 'Captured the latest speech-to-text result.')
    }

    recognition.onerror = () => {
      setIsListening(false)
      pushLog('Voice input error', 'The browser stopped the microphone session.')
    }

    recognitionRef.current = recognition
    setIsListening(true)
    pushLog('Voice input started', 'Listening for speech-to-text input.')
    recognition.start()
  }

  const apiStatus = apiBaseUrl || 'Local demo mode'

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Radidone lab dashboard</p>
          <h1>Minimal test bench for X-ray, session, and voice services.</h1>
          <p className="hero-text">
            Upload a panoramic X-ray, create a session, and test voice input/output
            independently in one lightweight React screen.
          </p>
        </div>

        <div className="hero-status">
          <span className="status-pill">API: {apiStatus}</span>
          <span className="status-pill">Upload: ready</span>
          <span className="status-pill">Voice: {voiceSupport.recognition ? 'enabled' : 'fallback'}</span>
        </div>
      </section>

      <section className="cards-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="card-label">01 · X-ray upload</p>
              <h2>Preview and stage a radiograph.</h2>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          <div className="preview-frame">
            {selectedFile && previewUrl ? (
              <img
                src={previewUrl}
                alt="Selected X-ray preview"
                className="preview-image"
              />
            ) : (
              <div className="preview-placeholder">
                <span>No image loaded</span>
                <p>Drop in a PNG or JPG to test the upload workflow.</p>
              </div>
            )}
          </div>

          <div className="detail-list">
            <div>
              <span>File</span>
              <strong>{selectedFile?.name || 'None'}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : '--'}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{uploadStatus}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="card-label">02 · Session</p>
              <h2>Start a test session and move phases.</h2>
            </div>
            <button type="button" className="primary-button" onClick={handleStartSession}>
              Start session
            </button>
          </div>

          <label className="field">
            <span>Mode</span>
            <select value={sessionMode} onChange={(event) => setSessionMode(event.target.value)}>
              <option value="guided">Guided</option>
              <option value="assessment">Assessment</option>
            </select>
          </label>

          <div className="session-badge-row">
            <span className="status-pill">Phase: {currentPhase}</span>
            <span className="status-pill">Session: {session?.id || 'Not started'}</span>
          </div>

          <p className="phase-copy">{phasePrompts[currentPhase]}</p>

          <div className="session-footer">
            <div className="session-meta">
              <span>Attached image</span>
              <strong>{session?.xray || selectedFile?.name || 'None'}</strong>
            </div>

            <button
              type="button"
              className="ghost-button"
              onClick={handleAdvancePhase}
              disabled={!session}
            >
              Next phase
            </button>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="card-label">03 · Voice</p>
              <h2>Capture speech and play mentor audio.</h2>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={handleToggleRecognition}
            >
              {isListening ? 'Stop mic' : 'Start mic'}
            </button>
          </div>

          <div className="voice-toolbar">
            <button
              type="button"
              className="primary-button"
              onClick={handleSpeakReply}
              disabled={!voiceSupport.speech}
            >
              {isSpeaking ? 'Speaking…' : 'Play voice output'}
            </button>
            <button type="button" className="ghost-button" onClick={handleUseSampleReply}>
              Reset mentor reply
            </button>
          </div>

          <label className="field">
            <span>Student voice input</span>
            <textarea
              rows={5}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Speak or type the student response here."
            />
          </label>

          <label className="field">
            <span>Mentor voice output</span>
            <textarea
              rows={5}
              value={mentorReply}
              onChange={(event) => setMentorReply(event.target.value)}
              placeholder="Edit the response before sending it to speech synthesis."
            />
          </label>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="card compact-card">
          <div className="card-header">
            <div>
              <p className="card-label">Service checklist</p>
              <h2>Independent test points.</h2>
            </div>
          </div>

          <ul className="checklist">
            <li>
              <strong>X-ray service</strong>
              <span>Upload a radiograph, preview it, and swap files quickly.</span>
            </li>
            <li>
              <strong>Session service</strong>
              <span>Start a session, switch the mode, and step through phases.</span>
            </li>
            <li>
              <strong>Voice service</strong>
              <span>Use browser speech recognition and speech synthesis where available.</span>
            </li>
          </ul>
        </article>

        <article className="card compact-card">
          <div className="card-header">
            <div>
              <p className="card-label">Activity log</p>
              <h2>Recent actions.</h2>
            </div>
          </div>

          <div className="log-list">
            {logs.map((entry) => (
              <div className="log-entry" key={entry.id}>
                <div className="log-time">{formatTimestamp(entry.createdAt)}</div>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
