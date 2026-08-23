"""
Bonus feature: audio upload + speech-to-text transcription.

Runs entirely locally on CPU using faster-whisper (a fast CTranslate2
reimplementation of OpenAI's Whisper model). No API key, no account, no
external network call at request time - the model weights download once
automatically (cached under ~/.cache/huggingface) the first time this
endpoint is used, then everything runs offline.

The free, key-less "Record from microphone" option (browser Web Speech API,
implemented client-side in AudioUpload.jsx) is still available as a
zero-setup alternative for anyone who doesn't want to wait for the model
download or is on a low-RAM machine.
"""
import os
import tempfile
from functools import lru_cache

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import settings

router = APIRouter(prefix="/api", tags=["transcribe"])


@lru_cache(maxsize=1)
def _get_whisper_model():
    """
    Loads the local Whisper model once and reuses it across requests.
    Import is deferred to here so the rest of the app still starts up fine
    even if faster-whisper/ctranslate2 aren't installed yet.
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        raise RuntimeError(
            "faster-whisper is not installed. Run: pip install -r requirements.txt"
        ) from e

    return WhisperModel(
        settings.whisper_model_size,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
) -> dict:
    """
    `language`: "auto" (let Whisper detect it), or an ISO 639-1 code like
    "ur" (Urdu) or "en" (English) to force it. Urdu works out of the box -
    the default "base" model is multilingual (not the English-only ".en"
    variant), so no extra setup is needed to transcribe Urdu audio.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    whisper_language = None if language.lower() == "auto" else language.lower()

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            model = _get_whisper_model()
        except RuntimeError as e:
            raise HTTPException(status_code=501, detail=str(e)) from e

        segments, info = model.transcribe(
            tmp_path,
            beam_size=settings.whisper_beam_size,
            language=whisper_language,
        )
        transcript = " ".join(segment.text.strip() for segment in segments).strip()

        if not transcript:
            raise HTTPException(
                status_code=422,
                detail="Couldn't detect any speech in that audio file.",
            )

        return {
            "success": True,
            "transcript": transcript,
            "detected_language": info.language,
        }

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}") from e
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
