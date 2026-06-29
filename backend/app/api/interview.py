"""
Interview preparation API routes.
Generates technical and HR interview questions at configurable difficulty levels.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import InterviewGenerateRequest, InterviewPrepResponse, InterviewQuestion
from app.rag.rag_pipeline import run_interview_generator
from app.services.ingestion_service import ingest_job_description, ingest_resume

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview Preparation"])


def _uuid_str(value: uuid.UUID | str | None) -> str | None:
    return str(value) if value is not None else None


async def _ensure_resume_ingested(resume: Resume, db: AsyncSession) -> str:
    if resume.chroma_collection_id:
        return resume.chroma_collection_id
    if not resume.parsed_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume has no parsed text. Please re-upload the file.",
        )
    try:
        from langchain.schema import Document
        docs = [Document(page_content=resume.parsed_text, metadata={"source": resume.filename})]
        return await ingest_resume(resume, docs, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Resume indexing with Gemini failed: {str(e)}. Please check your Gemini API key/quota, then try again.",
        )


async def _ensure_jd_ingested(jd: JobDescription, db: AsyncSession) -> str:
    if jd.chroma_collection_id:
        return jd.chroma_collection_id
    try:
        return await ingest_job_description(jd, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Job description indexing with Gemini failed: {str(e)}. Please check your Gemini API key/quota, then try again.",
        )


@router.post(
    "/generate",
    response_model=InterviewPrepResponse,
    summary="Generate interview questions",
)
async def generate_interview_questions(
    payload: InterviewGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InterviewPrepResponse:
    """
    Generate personalized interview questions based on resume + job description.
    Produces both technical questions and HR/behavioral questions.
    Supports beginner, intermediate, and advanced difficulty levels.
    """
    resume_id = _uuid_str(payload.resume_id)
    job_description_id = _uuid_str(payload.job_description_id)

    # Validate resume
    resume_result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    # Validate JD
    jd_result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == job_description_id,
            JobDescription.user_id == current_user.id,
        )
    )
    jd = jd_result.scalar_one_or_none()
    if not jd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found.")
    resume_collection = await _ensure_resume_ingested(resume, db)
    jd_collection = await _ensure_jd_ingested(jd, db)

    try:
        result = await run_interview_generator(
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
        )
    except Exception as e:
        logger.error(f"Interview generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Question generation failed: {str(e)}",
        )

    # Remove model answers if not requested
    if not payload.include_answers:
        for q in result.get("technical_questions", []):
            q["model_answer"] = None
        for q in result.get("hr_questions", []):
            q["model_answer"] = None

    technical = [InterviewQuestion(**q) for q in result.get("technical_questions", [])]
    hr = [InterviewQuestion(**q) for q in result.get("hr_questions", [])]

    return InterviewPrepResponse(
        difficulty=payload.difficulty,
        technical_questions=technical,
        hr_questions=hr,
        total_questions=len(technical) + len(hr),
    )
