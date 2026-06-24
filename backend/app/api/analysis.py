"""
Match Analysis API routes.
Compares a resume against a job description and returns skill gap analysis.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import MatchAnalysisRequest, MatchAnalysisResponse
from app.rag.rag_pipeline import run_match_analysis
from app.services.ingestion_service import ingest_job_description, ingest_resume

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["Analysis"])

_BILLING_HINT = (
    " This usually means your OpenAI API key has no credits. "
    "Add billing at https://platform.openai.com/settings/billing, then re-upload your files."
)


async def _ensure_resume_ingested(resume: Resume, db: AsyncSession) -> str:
    """Ensure a resume has been ingested into ChromaDB. Ingest on-demand if not."""
    if resume.chroma_collection_id:
        return resume.chroma_collection_id

    if not resume.parsed_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume has no parsed text. Please re-upload the file.",
        )

    # Attempt on-demand ingestion
    try:
        from langchain.schema import Document
        docs = [Document(page_content=resume.parsed_text, metadata={"source": resume.filename})]
        collection_id = await ingest_resume(resume, docs, db)
        return collection_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Resume indexing failed: {str(e)}.{_BILLING_HINT}",
        )


async def _ensure_jd_ingested(jd: JobDescription, db: AsyncSession) -> str:
    """Ensure a JD has been ingested into ChromaDB. Ingest on-demand if not."""
    if jd.chroma_collection_id:
        return jd.chroma_collection_id

    try:
        collection_id = await ingest_job_description(jd, db)
        return collection_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Job description indexing failed: {str(e)}.{_BILLING_HINT}",
        )


@router.post(
    "/match",
    response_model=MatchAnalysisResponse,
    summary="Analyze resume-job description match",
)
async def analyze_match(
    payload: MatchAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MatchAnalysisResponse:
    """
    Perform a comprehensive match analysis between a resume and job description.
    Returns: match score, matched skills, missing skills, and improvement suggestions.
    """
    # Fetch and validate resume
    resume_result = await db.execute(
        select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    # Fetch and validate JD
    jd_result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == payload.job_description_id,
            JobDescription.user_id == current_user.id,
        )
    )
    jd = jd_result.scalar_one_or_none()
    if not jd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found.")

    # Ensure both are indexed in ChromaDB (auto-ingest if needed)
    resume_collection = await _ensure_resume_ingested(resume, db)
    jd_collection = await _ensure_jd_ingested(jd, db)

    # Run RAG analysis
    try:
        result = await run_match_analysis(resume_collection, jd_collection)
    except Exception as e:
        logger.error(f"Match analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}.{_BILLING_HINT}",
        )

    # Update match score in DB
    jd.match_score = result.get("match_score", 0.0)
    await db.commit()

    return MatchAnalysisResponse(**result)
