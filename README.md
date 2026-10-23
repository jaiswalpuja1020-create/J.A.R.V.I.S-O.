# J.A.R.V.I.S.-O - Iron Man AI Command Center

A movie-inspired, futuristic Iron Man J.A.R.V.I.S.-O artificial intelligence assistant and Stark Industries HUD command center built for Desktop, Tablet, and Mobile devices with interactive voice command capabilities.

---

## 1. System Architecture

- **Frontend**: Responsive Stark Industries HUD Interface with glassmorphic panels, animated Arc Reactor / holographic concentric rings, audio waveform visualizers, push-to-talk Web Speech API voice recognition, speech synthesis, synthesized Web Audio laser repulsor sound effects, and mobile-adaptive drawers.
- **Backend**: Node.js REST API with session isolation, conversation memory, and multi-provider fallback routing.
- **AI Routing**: Multi-provider router with strict allowlisting across exactly 4 direct model providers:
  1. **Google Gemini** (Default Primary Core via official `@google/genai` SDK - `gemini-3.8-flash`)
  2. **NVIDIA NIM API** (`meta/llama-3.3-70b-instruct`)
  3. **LLM7.io API** (`claude-3-5-sonnet`)
  4. **OpenRouter API** (`meta-llama/llama-3.3-70b-instruct:free`)

---

## 2. API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System diagnostics, uptime, and configured providers status |
| `/api/chat` | `POST` | Multi-turn AI chat with session isolation and tool orchestration |
| `/api/providers` | `GET` | List approved providers, verified models, and configuration status |
| `/api/providers/test` | `POST` | Real latency ping test on a selected provider |
| `/api/search` | `POST` | Real-time external web search (Tavily/SerpApi) |
| `/api/files/upload` | `POST` | Upload and index documents (TXT, MD, JSON, CSV, PDF, DOCX) |
| `/api/files/search` | `POST` | Query indexed document chunks |
| `/api/conversations` | `GET / POST` | List or create isolated conversation sessions |
| `/api/conversations/:id` | `GET / DELETE` | Retrieve or purge a conversation |
| `/api/settings` | `GET` | Safe client application settings |
| `/api/tests` | `GET` | Automated test runner endpoint |

---

## 3. Interactive Voice Interaction

- **Voice Input**: Web Speech Recognition with Push-to-Talk or automatic end-of-speech detection. Supports English, Hindi, and Hinglish.
- **Voice Output**: Browser Speech Synthesis with automatic British/suave J.A.R.V.I.S. voice selection, adjustable speech speed, and stop speaking controls.
- **Audio Effects**: Synthesized Web Audio API sound effects (no external audio files required):
  - Arc Reactor hum & power surge
  - Laser Repulsor blast
  - Vocal listening triad chime
  - Target lock & HUD confirmation chirps

---

## 4. Deterministic Safe Tool Registry

Deterministic operations run through allowlisted JavaScript tools without relying solely on generative text:
1. **Calculator**: Safe tokenized mathematical parser (supports `sqrt`, `sin`, `cos`, `tan`, `log`, `^`, `%`, `abs`, `round` - zero `eval`).
2. **Date & Time**: Worldwide Stark Command clocks (Malibu HQ, Stark Tower NYC, London, Tokyo, Mumbai Hub) and stardates.
3. **Unit Conversion**: Engineering and physics conversion across Speed (Mach, mph, km/h), Energy (Joules, kWh, Arc Reactor output), Distance (km, miles), and Temperature (C, F, Kelvin).
4. **Text Utilities**: Word/character metrics, slugification, readability, and formatting.
5. **JSON Validator**: Syntax linting, formatting, minification, and key inspection.
6. **In-App Notes**: In-memory Stark tactical logbook.
7. **In-App Tasks**: Defense protocol checklist with priority and completion states.

---

## 5. Environment Configuration

Copy `.env.example` to `.env` or set in server environment variables:

```bash
# AI Model Provider Credentials (Server-Side Only)
GEMINI_API_KEY="your-gemini-key"
NVIDIA_API_KEY=""
LLM7_API_KEY=""
OPENROUTER_API_KEY=""

# Optional Web Search
SEARCH_PROVIDER=""
SEARCH_API_KEY=""

# System Config
AI_DEFAULT_PROVIDER="gemini"
AI_FALLBACK_ENABLED="true"
AI_MAX_FALLBACK_ATTEMPTS="2"
PORT="3000"
```

---

## 6. Running Automated Tests

Run the test suite through the automated test endpoint:
```bash
curl http://localhost:3000/api/tests
```
All unit tests verify environment configuration, tool mathematics, conversation session isolation, and document indexing.
