"""
Text splitting configuration for the RAG pipeline.
Splits documents into overlapping chunks for optimal retrieval.
"""
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


# Default splitter for resumes and job descriptions
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200

# Smaller chunks for dense technical content
TECHNICAL_CHUNK_SIZE = 600
TECHNICAL_CHUNK_OVERLAP = 100


def get_default_splitter() -> RecursiveCharacterTextSplitter:
    """
    Return the default text splitter for resume/JD content.
    Uses recursive splitting on: paragraph → sentence → word boundaries.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
        add_start_index=True,
    )


def get_technical_splitter() -> RecursiveCharacterTextSplitter:
    """Smaller chunks for technical job descriptions with dense content."""
    return RecursiveCharacterTextSplitter(
        chunk_size=TECHNICAL_CHUNK_SIZE,
        chunk_overlap=TECHNICAL_CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
        add_start_index=True,
    )


def split_documents(
    documents: list[Document],
    source_type: str = "resume",
    doc_id: str | None = None,
) -> list[Document]:
    """
    Split a list of LangChain Documents into chunks.

    Args:
        documents: List of LangChain Document objects
        source_type: 'resume' or 'job_description' — affects splitter config
        doc_id: Database ID to embed in chunk metadata for retrieval tracing

    Returns:
        List of chunked Document objects with enriched metadata
    """
    splitter = (
        get_technical_splitter()
        if source_type == "job_description"
        else get_default_splitter()
    )

    chunks = splitter.split_documents(documents)

    # Enrich metadata for each chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata.update(
            {
                "source_type": source_type,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
        )
        if doc_id:
            chunk.metadata["doc_id"] = doc_id

    return chunks
