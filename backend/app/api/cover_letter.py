"""
Cover Letter generation API routes.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import CoverLetterRequest, CoverLetterResponse
from app.rag.rag_pipeline import run_cover_letter_generator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])


@router.post(
    "/generate",
    response_model=CoverLetterResponse,
    summary="Generate a personalized cover letter",
)
async def generate_cover_letter(
    payload: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoverLetterResponse:
    """
    Generate a personalized cover letter based on resume content and job description.
    Supports professional, enthusiastic, and concise tones.
    """
    # Validate resume
    resume_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume or not resume.chroma_collection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or not indexed.",
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
            detail="Job description not found or not indexed.",
        )

    try:
        result = await run_cover_letter_generator(
            resume_collection=resume.chroma_collection_id,
            jd_collection=jd.chroma_collection_id,
            tone=payload.tone,
            additional_context=payload.additional_context or "",
        )
    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cover letter generation failed: {str(e)}",
        )

    return CoverLetterResponse(**result)
