workspace "Radidone" "AI dental radiology education platform" {

    model {

        # ── People ──────────────────────────────────────────────────────────
        dentalStudent = person "Dental Student" "Uploads panoramic X-rays, annotates findings on the canvas, and converses with the AI mentor to learn dental radiology."

        # ── External software systems ────────────────────────────────────────
        thaakaMedApi  = softwareSystem "Dental AI API"   "Accepts X-ray images and returns per-tooth disease predictions with probabilities." "External"
        llmProvider  = softwareSystem "LLM provider"    "Large-language-model API used to generate mentor responses." "External"
        sttApi = softwareSystem "Speech-to-text API" "Converts student voice input into text for mentor processing." "External"
        ttsApi = softwareSystem "Text-to-speech API" "Converts mentor text responses into audio for student playback." "External"
        clerkApi = softwareSystem "Clerk API" "Handles user authentication, session management, and access control." "External"

        # ── Radidone system ──────────────────────────────────────────────────
        radidone = softwareSystem "Radidone" "Interactive AI-powered dental radiology education platform with voice-driven Socratic mentoring and annotatable X-ray canvas." {

            # ── Containers ──────────────────────────────────────────────────
            webApp = container "Web application" "Single-page application providing the interactive canvas, voice interface, and chat UI for students and faculty." "React / TypeScript" "Web Browser"

            apiGateway = container "API gateway" "Entry point for all HTTP and WebSocket traffic. Handles authentication, rate-limiting, and request routing." "Node.js / Express"

            sessionOrchestrator = container "Session orchestrator" "Manages the full lifecycle of a learning session: creation, phase transitions, and state persistence." "Node.js"

            mentorEngine = container "Mentor engine" "Core educational logic. Assembles prompts, drives phases, interprets canvas annotations, and controls finding reveal." "Python / FastAPI" {
                contextBuilder        = component "Context builder"        "Assembles API diagnostic results, student annotation history, and conversation turns into LLM context."
                promptAssembler       = component "Prompt assembler"       "Builds the system and user prompts appropriate for the current session phase."
                annotationInterpreter = component "Annotation interpreter" "Converts canvas polygon/circle annotations and tooth references into structured clinical findings the LLM can reason about."
                llmClient             = component "LLM client"             "Streams completion requests to the LLM provider and handles token-level response streaming."
                responseParser        = component "Response parser"        "Extracts canvas highlight instructions, phase-advance signals, and score deltas from LLM output."
            }

            imageService = container "Image service" "Accepts X-ray uploads, performs pre-processing, and calls the Dental AI API. Stores annotated images." "Python / FastAPI"

            voiceService = container "Voice service" "Bridges STT and TTS: receives audio from the browser, streams transcriptions, and converts mentor text to audio." "Node.js" {
                sttClient = component "STT client" "Streams student audio to the speech-to-text API and relays transcriptions back to the orchestrator."
                ttsClient = component "TTS client" "Sends mentor text responses to the text-to-speech API and relays audio back to the browser."
            }

            database = container "Database" "Persists sessions, conversation turns, student annotations, diagnostic results, and progress records." "PostgreSQL" "Database"

            objectStore = container "Object store" "Stores uploaded X-ray images and demo analysis" "S3-compatible" "File Store"
        }

        # ── Relationships: people → system ───────────────────────────────────
        dentalStudent -> radidone    "Uploads X-rays, annotates findings, conducts voice sessions"
        dentalStudent -> webApp      "Interacts with the web application interface"

        # ── Relationships: system → external system ───────────────────────────
        radidone -> thaakaMedApi "Sends X-ray images for analysis and receives"
        radidone -> llmProvider "Sends prompts and receives mentor responses"
        radidone -> sttApi "Sends student voice input and receives transcriptions"  
        radidone -> ttsApi "Sends mentor text responses and receives audio"
        radidone -> clerkApi "Sends authentication requests and receives user/session data"
        
        # ── Relationships: system → external system ───────────────────────────
        imageService -> thaakaMedApi "Sends X-ray images and receives per-tooth predictions"
        imageService -> objectStore "Stores uploaded and annotated X-ray images"
        voiceService -> sttApi "Sends student audio stream and receives transcriptions"
        voiceService -> ttsApi "Sends mentor text responses and receives audio stream"        
        mentorEngine -> llmProvider "Sends assembled prompts and receives streamed mentor responses"


        # ── Relationships: system → system (containers) ─────────────────────────
        webApp -> apiGateway "HTTP and WebSocket requests"
        apiGateway -> sessionOrchestrator "Routes session management requests"
        sessionOrchestrator -> imageService "Sends X-ray images for analysis"
        sessionOrchestrator -> voiceService "Relays student voice input and mentor text responses"
        sessionOrchestrator -> mentorEngine "Sends session state, student annotations, and conversation history for mentor processing"
        sessionOrchestrator -> database "Persists session state, conversation turns, and student annotations"
        
        # ── Relationships: web app ───────────────────────────────────────
        webApp -> clerkApi "Authenticates users and retrieves session tokens"
        webApp -> voiceService "Streams microphone audio and receives mentor audio via WebSocket"

        # ── Relationships: API gateway ───────────────────────────────────
        apiGateway -> clerkApi "Validates JWT tokens and retrieves user identity"

        # ── Relationships: session orchestrator ──────────────────────────
        sessionOrchestrator -> objectStore "Retrieves uploaded images and generated overlays"
        sessionOrchestrator -> webApp "Streams mentor responses, session updates, and phase changes"

        # ── Relationships: mentor engine ─────────────────────────────────
        mentorEngine -> database "Reads conversation history, annotations, and session state"
        mentorEngine -> objectStore "Retrieves annotated images and overlays"

        # ── Relationships: mentor engine internal components ─────────────
        contextBuilder -> database "Reads sessions, annotations, and conversation history"
        contextBuilder -> objectStore "Loads annotated images and AI overlays"

        promptAssembler -> contextBuilder "Receives assembled educational context"

        annotationInterpreter -> objectStore "Reads annotation geometry and image metadata"

        llmClient -> llmProvider "Streams prompts and receives completions"

        responseParser -> llmClient "Parses streamed LLM responses"

        # ── Relationships: image service ─────────────────────────────────
        imageService -> database "Stores AI predictions and image metadata"

        # ── Relationships: voice service ─────────────────────────────────
        voiceService -> database "Stores voice transcripts and interaction logs"

        sttClient -> sttApi "Streams audio and receives transcriptions"

        ttsClient -> ttsApi "Sends mentor text and receives synthesized speech"

        # ── Relationships: database/object store ─────────────────────────
        database -> objectStore "References stored image assets and overlays"
    }

    # ── Views ────────────────────────────────────────────────────────────────
    views {

        # Level 1 – System context
        systemContext radidone "SystemContext" "C4 Level 1 — System context" {
            include *
            autoLayout lr
        }

        # Level 2 – Containers
        container radidone "Containers" "C4 Level 2 — Containers" {
            include *
            autoLayout lr
        }

        # Level 3 – Components (mentor engine)
        component mentorEngine "MentorEngineComponents" "C4 Level 3 — Mentor engine components" {
            include *
            autoLayout tb
        }

        component voiceService "VoiceServiceComponents" "C4 Level 3 — Voice service components" {
            include *
            autoLayout tb
        }


        # ── Styles ───────────────────────────────────────────────────────────
        styles {
            element "Person" {
                shape Person
                background #1D9E75
                color #ffffff
                fontSize 14
            }
            element "External" {
                background #BA7517
                color #ffffff
                fontSize 14
            }
            element "Web Browser" {
                shape WebBrowser
                background #7F77DD
                color #ffffff
            }
            element "Database" {
                shape Cylinder
                background #888780
                color #ffffff
            }
            element "File Store" {
                shape Folder
                background #888780
                color #ffffff
            }
            element "Software System" {
                background #534AB7
                color #ffffff
                fontSize 14
            }
            element "Container" {
                background #7F77DD
                color #ffffff
                fontSize 13
            }
            element "Component" {
                background #AFA9EC
                color #26215C
                fontSize 12
            }
            relationship "Relationship" {
                fontSize 12
                color #5F5E5A
            }
        }
    }
}
