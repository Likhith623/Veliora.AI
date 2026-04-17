#logs.py
from fastapi import APIRouter
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/logs", tags=["Frontend Logs"])

class FrontendError(BaseModel):
    message: str | None = None
    source: str | None = None
    line_number: int | str | None = None
    column_number: int | str | None = None
    stack_trace: str | None = None
    browser: str | None = None
    url: str | None = None
    additional_context: dict | None = None
    timestamp: str | None = None

@router.post("/frontend-error")
async def log_frontend_error(error: FrontendError):
    logger.error(f"Frontend Error: {error.message} URL: {error.url} Stack: {error.stack_trace}")
    return {"status": "ok"}
