"""
AI Career Copilot — FastAPI Application Entry Point
"""
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, documents, analysis, chat, interview, cover_letter, email_generator
from app.config import get_settings
from app.database.connection import create_tables

import io
import sys

# Configure logging — force UTF-8 on Windows to avoid emoji encoding crashes
_stream = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace") if hasattr(sys.stdout, "buffer") else sys.stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(_stream)],
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan: startup and shutdown events."""
    logger.info("🚀 Starting AI Career Copilot API...")

    # Create upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    logger.info(f"📁 Upload directory ready: {settings.upload_dir}")

    # Create database tables (use Alembic for production migrations)
    if settings.app_env == "development":
        await create_tables()
        logger.info("🗃️  Database tables created/verified")

    logger.info("✅ Application startup complete")
    yield
    logger.info("👋 Shutting down AI Career Copilot API...")


# ============================================================
# FastAPI Application
# ============================================================
app = FastAPI(
    title="AI Career Copilot API",
    description=(
        "Production-ready AI Career Assistant powered by LangChain RAG + OpenAI GPT-4o. "
        "Features: resume analysis, job matching, interview prep, cover letter generation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ============================================================
# Middleware
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Global Exception Handler
# ============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ============================================================
# Health Check
# ============================================================
@app.get("/health", tags=["Health"], summary="Health check")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": "AI Career Copilot API",
        "version": "1.0.0",
        "environment": settings.app_env,
    }


@app.get("/", tags=["Root"], summary="API root")
async def root() -> dict:
    return {
        "message": "Welcome to AI Career Copilot API",
        "docs": "/docs",
        "version": "1.0.0",
    }


# ============================================================
# Router Registration
# ============================================================
app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(cover_letter.router, prefix="/api/v1")
app.include_router(email_generator.router, prefix="/api/v1")

# Future routers will be added here as phases complete:
# app.include_router(documents.router, prefix="/api/v1")
# app.include_router(analysis.router, prefix="/api/v1")
# app.include_router(chat.router, prefix="/api/v1")
# app.include_router(interview.router, prefix="/api/v1")
# app.include_router(cover_letter.router, prefix="/api/v1")
# app.include_router(email_generator.router, prefix="/api/v1")
