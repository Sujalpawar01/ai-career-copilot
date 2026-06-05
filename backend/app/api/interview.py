"""
Interview preparation API routes.
Generates technical and HR interview questions at configurable difficulty levels.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import InterviewGenerateRequest, InterviewPrepResponse, InterviewQuestion
from app.rag.rag_pipeline import run_interview_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview Preparation"])


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
    # Validate resume
    resume_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume or not resume.chroma_collection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or not yet indexed. Please upload and wait for processing.",
        )

    # Validate JD
    jd_result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == payload.job_description_id,
            JobDescription.user_id == current_user.id,
        )
    )
    jd = jd_result.scalar_one_or_none()
    if not jd or not jd.chroma_collection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found or not yet indexed.",
        )

    try:
        result = await run_interview_generator(
            resume_collection=resume.chroma_collection_id,
            jd_collection=jd.chroma_collection_id,
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
