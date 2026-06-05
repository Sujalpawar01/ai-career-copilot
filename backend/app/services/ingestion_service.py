"""
Ingestion service: orchestrates the full pipeline of
parse → split → embed → store for both resumes and job descriptions.
"""
import logging

from langchain.schema import Document
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import JobDescription, Resume
from app.rag.text_splitter import split_documents
from app.rag.vector_store import (
    add_documents_to_store,
    get_jd_collection_name,
    get_resume_collection_name,
)
from app.services.document_parser import parse_plain_text

logger = logging.getLogger(__name__)


async def ingest_resume(
    resume: Resume,
    documents: list[Document],
    db: AsyncSession,
) -> str:
    """
    Ingest a parsed resume into ChromaDB.

    Steps:
    1. Split documents into chunks
    2. Store chunks in ChromaDB
    3. Update resume record with collection ID

    Args:
        resume: The Resume ORM object
        documents: LangChain Documents from document parser
        db: AsyncSession for updating the resume record

    Returns:
        The ChromaDB collection name
    """
    resume_id = str(resume.id)
    collection_name = get_resume_collection_name(resume_id)

    # Split into chunks with metadata
    chunks = split_documents(
        documents=documents,
        source_type="resume",
        doc_id=resume_id,
    )
    logger.info(f"Resume {resume_id} split into {len(chunks)} chunks")

    # Store in ChromaDB
    await add_documents_to_store(
        documents=chunks,
        collection_name=collection_name,
        doc_id=resume_id,
    )

    # Update the resume record with its collection ID
    resume.chroma_collection_id = collection_name
    await db.flush()

    logger.info(f"Resume {resume_id} ingested into ChromaDB collection '{collection_name}'")
    return collection_name


async def ingest_job_description(
    jd: JobDescription,
    db: AsyncSession,
    documents: list[Document] | None = None,
) -> str:
    """
    Ingest a job description into ChromaDB.
    If no documents are provided, wraps jd.raw_text as a Document.

    Steps:
    1. Prepare documents (from file or raw text)
    2. Split into chunks
    3. Store in ChromaDB
    4. Update JD record with collection ID

    Args:
        jd: The JobDescription ORM object
        db: AsyncSession for updating the JD record
        documents: Optional pre-parsed LangChain Documents (from file upload)

    Returns:
        The ChromaDB collection name
    """
    jd_id = str(jd.id)
    collection_name = get_jd_collection_name(jd_id)

    # Use raw text if no pre-parsed documents
    if documents is None:
        documents = parse_plain_text(jd.raw_text, source=f"job_description_{jd_id}")

    # Split into chunks
    chunks = split_documents(
        documents=documents,
        source_type="job_description",
        doc_id=jd_id,
    )
    logger.info(f"Job description {jd_id} split into {len(chunks)} chunks")

    # Store in ChromaDB
    await add_documents_to_store(
        documents=chunks,
        collection_name=collection_name,
        doc_id=jd_id,
    )

    # Update the JD record
    jd.chroma_collection_id = collection_name
    await db.flush()

    logger.info(f"JD {jd_id} ingested into ChromaDB collection '{collection_name}'")
    return collection_name
