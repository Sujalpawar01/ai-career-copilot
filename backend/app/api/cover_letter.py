"""
Cover Letter generation API routes.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import CoverLetterRequest, CoverLetterResponse
from app.rag.rag_pipeline import run_cover_letter_generator
from app.services.ingestion_service import ingest_job_description, ingest_resume

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])

_BILLING_HINT = (
    " Please check your Gemini API key/quota, then try again."
)


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
            detail=f"Resume indexing with Gemini failed: {str(e)}.{_BILLING_HINT}",
        )


async def _ensure_jd_ingested(jd: JobDescription, db: AsyncSession) -> str:
    if jd.chroma_collection_id:
        return jd.chroma_collection_id
    try:
        return await ingest_job_description(jd, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Job description indexing with Gemini failed: {str(e)}.{_BILLING_HINT}",
        )


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
        result = await run_cover_letter_generator(
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            tone=payload.tone,
            additional_context=payload.additional_context or "",
        )
    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cover letter generation failed: {str(e)}.{_BILLING_HINT}",
        )

    return CoverLetterResponse(**result)
