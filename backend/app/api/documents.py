"""
Document upload API routes.
Handles resume (PDF/DOCX) and job description uploads.
"""
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import get_settings
from app.database.connection import get_db
from app.database.models import JobDescription, Resume, User
from app.models.schemas import (
    JobDescriptionResponse,
    JobDescriptionTextRequest,
    ResumeResponse,
    ResumeUploadResponse,
)
from app.services.document_parser import (
    DocumentParserError,
    parse_plain_text,
    parse_uploaded_file,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Documents"])


# ============================================================
# Resume Routes
# ============================================================

@router.post(
    "/resume/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume (PDF or DOCX)",
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 10MB)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumeUploadResponse:
    """
    Upload and parse a resume file.
    - Accepts PDF or DOCX
    - Extracts text using LangChain document loaders
    - Stores in PostgreSQL (vector indexing happens asynchronously)
    """
    # Validate file size
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.max_upload_size_mb}MB",
        )
    # Reset file position after reading
    await file.seek(0)

    try:
        file_type, parsed_text, _ = await parse_uploaded_file(file)
    except DocumentParserError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Save file to disk
    upload_path = Path(settings.upload_dir) / "resumes" / str(current_user.id)
    upload_path.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4()}.{file_type}"
    file_path = upload_path / safe_filename

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Save to database
    resume = Resume(
        user_id=current_user.id,
        filename=safe_filename,
        original_filename=file.filename or "resume",
        file_type=file_type,
        parsed_text=parsed_text,
        file_path=str(file_path),
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)

    logger.info(f"Resume uploaded: {resume.id} for user {current_user.email}")

    return ResumeUploadResponse(
        message="Resume uploaded and parsed successfully",
        resume=ResumeResponse.model_validate(resume),
    )


@router.get(
    "/resume/{resume_id}",
    response_model=ResumeResponse,
    summary="Get a specific resume",
)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Resume:
    """Retrieve a specific resume by ID (must belong to current user)."""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    return resume


@router.get(
    "/resume",
    response_model=list[ResumeResponse],
    summary="List all resumes for current user",
)
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Resume]:
    """Return all resumes belonging to the current user."""
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.id, Resume.is_active == True)
        .order_by(Resume.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete(
    "/resume/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a resume",
)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete a resume (sets is_active=False)."""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = result.scalar_one_or_none()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    resume.is_active = False


# ============================================================
# Job Description Routes
# ============================================================

@router.post(
    "/job",
    response_model=JobDescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a job description (text)",
)
async def create_job_description(
    payload: JobDescriptionTextRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobDescription:
    """
    Submit a job description as plain text.
    Text will be embedded and stored in ChromaDB for RAG retrieval.
    """
    jd = JobDescription(
        user_id=current_user.id,
        title=payload.title,
        company=payload.company,
        raw_text=payload.raw_text,
    )
    db.add(jd)
    await db.flush()
    await db.refresh(jd)

    logger.info(f"Job description created: {jd.id} for user {current_user.email}")
    return jd


@router.post(
    "/job/upload",
    response_model=JobDescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a job description file (PDF or DOCX)",
)
async def upload_job_description(
    file: UploadFile = File(...),
    title: str = Form(...),
    company: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobDescription:
    """Upload and parse a JD file, then store in the database."""
    try:
        file_type, parsed_text, _ = await parse_uploaded_file(file)
    except DocumentParserError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    jd = JobDescription(
        user_id=current_user.id,
        title=title,
        company=company,
        raw_text=parsed_text,
        filename=file.filename,
    )
    db.add(jd)
    await db.flush()
    await db.refresh(jd)

    logger.info(f"JD uploaded: {jd.id} for user {current_user.email}")
    return jd


@router.get(
    "/job/{job_id}",
    response_model=JobDescriptionResponse,
    summary="Get a specific job description",
)
async def get_job_description(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobDescription:
    """Retrieve a specific job description by ID."""
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == job_id,
            JobDescription.user_id == current_user.id,
        )
    )
    jd = result.scalar_one_or_none()

    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found",
        )
    return jd


@router.get(
    "/job",
    response_model=list[JobDescriptionResponse],
    summary="List all job descriptions for current user",
)
async def list_job_descriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[JobDescription]:
    """Return all job descriptions belonging to the current user."""
    result = await db.execute(
        select(JobDescription)
        .where(JobDescription.user_id == current_user.id)
        .order_by(JobDescription.created_at.desc())
    )
    return list(result.scalars().all())
