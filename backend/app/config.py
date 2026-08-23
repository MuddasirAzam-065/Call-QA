"""
App configuration + the single place that builds the LangChain chat model.

This is where the "OpenRouter preferred, local CPU model optional" requirement
is implemented: one function returns a configured `ChatOpenAI` instance that
either points at OpenRouter's OpenAI-compatible endpoint, or at a local
Ollama/llama.cpp OpenAI-compatible server.
"""
import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


class Settings:
    # OpenRouter
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str = os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173")
    openrouter_site_name: str = os.getenv("OPENROUTER_SITE_NAME", "Call QA Mini Product")

    # Local model fallback
    use_local_model: bool = os.getenv("USE_LOCAL_MODEL", "false").lower() == "true"
    local_model_base_url: str = os.getenv("LOCAL_MODEL_BASE_URL", "http://localhost:11434/v1")
    local_model_name: str = os.getenv("LOCAL_MODEL_NAME", "llama3.1:8b")

    # Audio upload -> speech-to-text bonus feature.
    # Runs fully locally on CPU via faster-whisper - no API key needed.
    # Model sizes (speed vs. accuracy, all run fine on a normal laptop):
    #   tiny / base  -> fastest, good enough for clear call audio (default: base)
    #   small        -> noticeably more accurate, still quick on CPU
    #   medium/large -> best accuracy, slow on CPU, needs more RAM
    whisper_model_size: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute_type: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    whisper_beam_size: int = int(os.getenv("WHISPER_BEAM_SIZE", "5"))

    # App
    cors_origins: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]
    history_db_path: str = os.getenv("HISTORY_DB_PATH", "./data/history.json")


settings = Settings()


@lru_cache(maxsize=1)
def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    """
    Returns a configured LangChain ChatOpenAI client.

    - Default path: OpenRouter (OpenAI-compatible REST API), using a free-tier model.
    - Optional path: a local OpenAI-compatible server (e.g. Ollama running
      `ollama serve`, or llama.cpp's server), selected via USE_LOCAL_MODEL=true.

    The API key never reaches the frontend - it only ever lives in this
    backend process, read from the environment.
    """
    if settings.use_local_model:
        return ChatOpenAI(
            model=settings.local_model_name,
            base_url=settings.local_model_base_url,
            api_key="not-needed",  # local servers usually ignore this
            temperature=temperature,
        )

    if not settings.openrouter_api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Add it to backend/.env "
            "(see backend/.env.example), or set USE_LOCAL_MODEL=true to use a local model."
        )

    return ChatOpenAI(
        model=settings.openrouter_model,
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
        temperature=temperature,
        default_headers={
            "HTTP-Referer": settings.openrouter_site_url,
            "X-Title": settings.openrouter_site_name,
        },
    )


def model_label() -> str:
    if settings.use_local_model:
        return f"local:{settings.local_model_name}"
    return f"openrouter:{settings.openrouter_model}"
