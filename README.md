# Callboard — AI Call QA Console

A full-stack app that takes a customer-service call transcript, runs it through a multi-step
LangGraph/LangChain AI workflow, and returns a structured QA report: an overall score, five
scored categories, sentiment analysis, strengths, problems, improvement advice, and the
transcript's most important moments — all rendered in a console/signal-meter themed UI.

Built for the "Build an AI-Powered Call QA Mini Product" intern assignment.

---

## 1. Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS (custom design system, no component library) |
| Backend | FastAPI (Python) |
| AI framework | LangChain (model + prompt integration) + LangGraph (multi-step workflow) |
| LLM provider | OpenRouter (free-tier model), with an optional local-model fallback |
| Persistence | Flat JSON file (`backend/data/history.json`) for call history |

## 2. How it works

1. The user pastes a transcript (or dictates one live, or uploads an audio file) into the
   React frontend and clicks **Analyze call**.
2. The frontend `POST`s the transcript to `FastAPI`'s `/api/analyze` endpoint.
3. FastAPI hands the transcript to a **LangGraph** state graph (`backend/app/agents/qa_graph.py`)
   with five nodes, run in order:
   1. `validate_input` — cheap, non-LLM sanity check (empty/too short/no speaker turns).
      Routes straight to an error response if invalid.
   2. `score_categories` — one LLM call (via **LangChain**'s `ChatOpenAI`) that scores the call
      0–10 against each QA criterion, with a reasoned explanation per category.
   3. `detect_sentiment` — a second LLM call that reads how the customer's mood evolved and the
      agent's tone (bonus: sentiment detection).
   4. `compute_overall_score` — a third LLM call that audits the category scores and sentiment
      into one 0–100 score with a plain-English explanation (weighted, not a flat average).
   5. `generate_feedback` — a fourth LLM call that produces strengths, problems, improvement
      advice, and 3–6 "highlighted moments" (the most important individual sentences, bonus
      feature).
4. Every LLM call asks for **strict JSON**, parsed and validated with **Pydantic** models
   (`backend/app/models.py`). If a (small, free) model returns malformed JSON, the backend
   automatically retries once with a corrective instruction before giving up gracefully.
5. The finished report is saved to `backend/data/history.json` (bonus: call history) and
   returned to the frontend, which renders it as score dials, VU-meter-style bars, and
   highlighted quotes.

## 3. Model / provider used

- **Preferred:** [OpenRouter](https://openrouter.ai), talking to a free-tier chat model
  (default: `meta-llama/llama-3.1-8b-instruct:free`) through LangChain's `ChatOpenAI` class
  pointed at OpenRouter's OpenAI-compatible endpoint (`https://openrouter.ai/api/v1`).
  Any other free model slug from https://openrouter.ai/models?max_price=0 can be swapped in
  via an env var — no code changes needed.
- **Optional local fallback:** if `USE_LOCAL_MODEL=true` is set, the same `ChatOpenAI` client
  is pointed at a local OpenAI-compatible server instead (e.g. `ollama serve`), so the app
  runs fully offline on a machine with enough CPU/RAM.
- The API key is read **only** in `backend/app/config.py` on the server; it is never sent to,
  bundled into, or exposed by the React frontend.

## 4. Where each requirement is implemented

| Requirement | Where |
|---|---|
| React frontend | `frontend/src/` (Vite + Tailwind) |
| Paste transcript / Analyze button / loading & error states | `frontend/src/components/TranscriptPanel.jsx` |
| Display QA result clearly | `frontend/src/components/QAReport.jsx`, `ScoreDial.jsx`, `MeterBar.jsx` |
| FastAPI backend, analysis endpoint | `backend/app/main.py`, `backend/app/routes/analyze.py` |
| Structured JSON response | `backend/app/models.py` (`QAReport` etc.), returned by `/api/analyze` |
| Graceful invalid-input / model-failure handling | Pydantic validators in `models.py` (→ 400), try/except + global exception handler in `main.py` / `routes/analyze.py` (→ 502/500 with clean JSON, never a raw crash) |
| LangChain model/prompt integration | `backend/app/config.py` (`get_llm`), `backend/app/agents/prompts.py` |
| LangGraph multi-step workflow | `backend/app/agents/qa_graph.py` |
| OpenRouter, free-tier model | `backend/app/config.py`, configured via `backend/.env` |
| Local CPU model option | `USE_LOCAL_MODEL` in `backend/app/config.py` |
| Key kept backend-only | Never referenced in `frontend/`; only read via `os.getenv` in `backend/app/config.py` |
| Own QA prompts, no hard-coded results | `backend/app/agents/prompts.py` — every field comes from a live LLM call |
| Structured, validatable output | `JsonOutputParser` + Pydantic validation in `qa_graph.py` |
| Explains reasoning, not just numbers | Every category, the overall score, and sentiment include an `explanation` field the model must fill in |
| **Bonus:** audio upload + speech-to-text | `frontend/src/components/AudioUpload.jsx` (live mic dictation via the browser's Web Speech API, free/no key) + `backend/app/routes/transcribe.py` (audio file upload → local **faster-whisper**, runs on CPU, no key needed) |
| **Bonus:** sentiment detection | `detect_sentiment` node in `qa_graph.py`, rendered as a badge in `QAReport.jsx` |
| **Bonus:** save / view call history | `backend/app/history_store.py`, `backend/app/routes/history.py`, `frontend/src/components/HistorySidebar.jsx` |
| **Bonus:** configurable QA criteria | `frontend/src/components/CriteriaConfig.jsx` → sent as `criteria` in the request → used to build the scoring prompt in `prompts.py` |
| **Bonus:** highlight important transcript sentences | `highlighted_sentences` field, produced by `generate_feedback` node, rendered in `QAReport.jsx` |

## 5. Running it locally

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and paste your OPENROUTER_API_KEY (see "Keys" below)
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # defaults to http://localhost:8000, edit if needed
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## 6. Keys — what to add, and where

All keys live in **`backend/.env`** (copied from `backend/.env.example`). The frontend never
needs any secret key.

| Variable | Required? | What it's for | Where to get it |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes (unless using a local model) | Powers the whole QA analysis workflow | Free at https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | No (has a default) | Which free-tier model to use | Pick any `:free` slug from https://openrouter.ai/models?max_price=0 |
| `USE_LOCAL_MODEL` / `LOCAL_MODEL_BASE_URL` / `LOCAL_MODEL_NAME` | No | Run a local CPU model (e.g. Ollama) instead of OpenRouter for QA analysis | N/A — point at your local server |
| `WHISPER_MODEL_SIZE` | No (default `base`) | Which local Whisper model powers "upload an audio file" transcription | N/A — no key needed, downloads automatically on first use |
| `CORS_ORIGINS` | No (has a default) | Which frontend origins may call the API | Set to your deployed frontend URL in production |
| `HISTORY_DB_PATH` | No (has a default) | Where the call-history JSON file is stored | N/A |

`frontend/.env` only needs `VITE_API_URL`, pointing at wherever the backend is deployed.

## 7. Deployment

- **Backend** → Render / Railway / Fly.io: deploy `backend/` as a Python web service, start
  command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, set the env vars from the table
  above in the platform's dashboard (not in a committed `.env` file).
- **Frontend** → Vercel / Netlify: deploy `frontend/` as a static Vite build (`npm run build`,
  publish `dist/`), set `VITE_API_URL` to the deployed backend's URL.
- Update `CORS_ORIGINS` on the backend to include the deployed frontend's URL once you have it.

## 8. Problems faced / trade-offs

- Small free-tier models on OpenRouter don't always support native "tool calling" /
  guaranteed structured output, so instead of relying on function-calling, every node prompts
  for strict JSON and parses it defensively (with one automatic retry) — the more robust
  approach across arbitrary free models.
- True speech-to-text from an uploaded audio *file* needs a model like Whisper, which isn't
  reliably free on OpenRouter, so that path runs **faster-whisper locally on CPU** - no key,
  no account, works offline after the model's one-time download. Live microphone dictation
  (browser Web Speech API) is also available as an instant, zero-download alternative.
- Call history uses a flat JSON file rather than a real database to keep the assignment
  dependency-light and easy to run anywhere; `backend/app/history_store.py` is intentionally
  the only file that would need to change to swap in Postgres/SQLite.

## 10. Urdu language support

The app fully supports Urdu, end-to-end, alongside English:

- **Audio transcription**: pick "اردو Urdu" in the language selector before recording or
  uploading audio. Live mic dictation uses the `ur-PK` browser speech locale; file uploads use
  faster-whisper's multilingual model (the default `base` size is multilingual, not the
  English-only `.en` variant, so no extra setup is needed).
- **Typed/pasted transcripts**: just type or paste Urdu text directly into the transcript box -
  it automatically switches to right-to-left layout with the Noto Nastaliq Urdu font as you type.
- **AI analysis in Urdu**: use the "Report language" selector (Auto / English / Urdu) above the
  Analyze button. "Auto" makes the AI respond in whatever language the transcript is in; "Urdu"
  forces all explanations, reasoning, strengths, problems, and advice to be written in Urdu
  regardless of the transcript's language (JSON field names stay in English - only the
  human-readable text changes).
- **Report display**: every AI-generated text field (explanations, strengths, problems, advice,
  highlighted quotes) automatically renders right-to-left with the Urdu font when it detects
  Urdu script - no manual toggle needed.

## 11. UI interactivity

- **Live progress steps** during analysis (validating → scoring & sentiment → overall score →
  feedback) instead of a static spinner.
- **Toast notifications** for recording status, transcription results, save/delete confirmations,
  and errors.
- **Drag-and-drop** audio file upload, in addition to the file picker.
- Hover/press micro-animations on buttons, and a smooth fade-in when the QA report renders.

## 12. What I'd improve with more time

- Swap the JSON-file history store for a real database (Postgres via SQLAlchemy) with
  per-user auth, so QA reports aren't shared across everyone hitting the API.
- Add streaming responses (LangGraph supports streaming node-by-node) so the UI can show
  each QA step completing live instead of one loading spinner.
- Add automated tests (pytest for the graph/nodes with a mocked LLM, Playwright for the
  frontend flow).
- Let reviewers edit/override AI scores and feed that back as few-shot examples to improve
  prompt calibration over time.
