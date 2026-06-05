"""
Document parsing service using LangChain document loaders.
Supports PDF and DOCX formats.
"""
import logging
import os
import tempfile
from pathlib import Path

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain.schema import Document

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
}


class DocumentParserError(Exception):
    """Raised when document parsing fails."""
    pass


async def parse_uploaded_file(file: UploadFile) -> tuple[str, str, list[Document]]:
    """
    Parse an uploaded file (PDF or DOCX) and extract text content.

    Args:
        file: FastAPI UploadFile object

    Returns:
        Tuple of (file_type, extracted_text, langchain_documents)

    Raises:
        DocumentParserError: If file type is unsupported or parsing fails
    """
    content_type = file.content_type or ""
    file_ext = Path(file.filename or "").suffix.lower()

    # Determine file type
    if content_type in SUPPORTED_TYPES:
        file_type = SUPPORTED_TYPES[content_type]
    elif file_ext == ".pdf":
        file_type = "pdf"
    elif file_ext in (".docx", ".doc"):
        file_type = "docx"
    else:
        raise DocumentParserError(
            f"Unsupported file type: '{content_type}'. Only PDF and DOCX are supported."
        )

    # Read file content
    file_content = await file.read()
    if len(file_content) == 0:
        raise DocumentParserError("Uploaded file is empty")

    # Write to temp file for LangChain loaders
    suffix = f".{file_type}"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name

    try:
        documents = _load_documents(tmp_path, file_type)
        extracted_text = _combine_document_text(documents)

        if not extracted_text.strip():
            raise DocumentParserError(
                "Could not extract any text from the document. "
                "The file may be a scanned image or password-protected."
            )

        logger.info(
            f"Successfully parsed {file_type.upper()}: "
            f"{file.filename} ({len(extracted_text)} chars, {len(documents)} pages)"
        )
        return file_type, extracted_text, documents

    except DocumentParserError:
        raise
    except Exception as e:
        logger.error(f"Parsing failed for {file.filename}: {e}", exc_info=True)
        raise DocumentParserError(f"Failed to parse document: {str(e)}")
    finally:
        # Always clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _load_documents(file_path: str, file_type: str) -> list[Document]:
    """Load documents using the appropriate LangChain loader."""
    if file_type == "pdf":
        loader = PyPDFLoader(file_path)
    elif file_type in ("docx", "doc"):
        loader = Docx2txtLoader(file_path)
    else:
        raise DocumentParserError(f"No loader available for file type: {file_type}")

    return loader.load()


def _combine_document_text(documents: list[Document]) -> str:
    """Combine text from all document pages/sections."""
    parts = []
    for doc in documents:
        text = doc.page_content.strip()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def parse_plain_text(text: str, source: str = "pasted_text") -> list[Document]:
    """
    Wrap plain text (e.g., pasted job descriptions) into LangChain Documents.
    """
    return [
        Document(
            page_content=text,
            metadata={"source": source, "page": 0},
        )
    ]
