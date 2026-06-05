"""
HR Email Generator API routes.
Generates cold emails, LinkedIn messages, and follow-up emails.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import EmailGenerateRequest, EmailResponse
from app.rag.rag_pipeline import (
    run_cold_email_generator,
    run_followup_email_generator,
    run_linkedin_message_generator,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["Email Generator"])


async def _get_collections(
    payload: EmailGenerateRequest,
    current_user: User,
    db: AsyncSession,
) -> tuple[str | None, str | None]:
    """Helper to fetch ChromaDB collection names for resume and JD."""
    resume_collection = None
    jd_collection = None

    resume_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume or not resume.chroma_collection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or not indexed.",
        )
    resume_collection = resume.chroma_collection_id

    if payload.job_description_id:
        jd_result = await db.execute(
            select(JobDescription).where(
                JobDescription.id == payload.job_description_id,
                JobDescription.user_id == current_user.id,
            )
        )
        jd = jd_result.scalar_one_or_none()
        if jd:
            jd_collection = jd.chroma_collection_id

    return resume_collection, jd_collection


@router.post(
    "/cold",
    response_model=EmailResponse,
    summary="Generate a cold outreach email",
)
async def generate_cold_email(
    payload: EmailGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailResponse:
    """Generate a personalized cold email to a hiring manager or recruiter."""
    resume_collection, jd_collection = await _get_collections(payload, current_user, db)

    try:
        result = await run_cold_email_generator(
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            recipient_name=payload.recipient_name or "Hiring Manager",
            company_name=payload.company_name or "the company",
            additional_context=payload.additional_context or "",
        )
    except Exception as e:
        logger.error(f"Cold email generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return EmailResponse(**result)


@router.post(
    "/linkedin",
    response_model=EmailResponse,
    summary="Generate a LinkedIn connection message",
)
async def generate_linkedin_message(
    payload: EmailGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailResponse:
    """Generate a concise LinkedIn connection request message (≤300 chars)."""
    resume_collection, jd_collection = await _get_collections(payload, current_user, db)

    try:
        result = await run_linkedin_message_generator(
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            recipient_name=payload.recipient_name or "there",
            company_name=payload.company_name or "your company",
        )
    except Exception as e:
        logger.error(f"LinkedIn message generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return EmailResponse(**result)


@router.post(
    "/followup",
    response_model=EmailResponse,
    summary="Generate a follow-up email",
)
async def generate_followup_email(
    payload: EmailGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmailResponse:
    """Generate a professional follow-up email after an interview or application."""
    resume_collection, jd_collection = await _get_collections(payload, current_user, db)

    try:
        result = await run_followup_email_generator(
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            recipient_name=payload.recipient_name or "Hiring Manager",
            company_name=payload.company_name or "the company",
            additional_context=payload.additional_context or "",
        )
    except Exception as e:
        logger.error(f"Follow-up email generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return EmailResponse(**result)
