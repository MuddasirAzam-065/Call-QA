from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings, model_label
from app.routes import analyze, history, transcribe

app = FastAPI(
    title="Call QA Mini Product API",
    description="Analyzes customer-service call transcripts with LangChain + LangGraph "
                "and returns a structured QA report.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Final safety net so the frontend always gets clean JSON, never a raw 500 HTML page.
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": f"Internal server error: {exc}"},
    )


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": model_label()}


app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(transcribe.router)
