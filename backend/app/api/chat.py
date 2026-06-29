"""
RAG Chat API routes.
Provides conversational AI assistance grounded in resume and JD context.
"""
import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.models import ChatMessage, ChatSession, JobDescription, Resume, User
from app.models.schemas import (
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionResponse,
    SourceCitation,
)
from app.rag.rag_pipeline import run_rag_chat

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


def _uuid_str(value: uuid.UUID | str | None) -> str | None:
    return str(value) if value is not None else None


@router.post(
    "/message",
    response_model=ChatMessageResponse,
    summary="Send a message to the RAG chat assistant",
)
async def send_message(
    payload: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatMessageResponse:
    """
    Send a message to the AI career assistant.
    - Creates a new session if session_id is not provided
    - Retrieves relevant resume/JD chunks for grounded answers
    - Returns response with source citations
    """
    session_id = _uuid_str(payload.session_id)
    resume_id = _uuid_str(payload.resume_id)
    jd_id = _uuid_str(payload.job_description_id)

    # Get or create chat session
    if session_id:
        session_result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = session_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    else:
        session = ChatSession(
            user_id=current_user.id,
            resume_id=resume_id,
            job_description_id=jd_id,
            title=payload.message[:50] + "..." if len(payload.message) > 50 else payload.message,
        )
        db.add(session)
        await db.flush()

    # Build chat history from recent messages
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    recent_messages = list(reversed(history_result.scalars().all()))
    chat_history = "\n".join(
        [f"{msg.role.upper()}: {msg.content}" for msg in recent_messages[-6:]]
    )

    # Get ChromaDB collection names
    resume_collection = None
    jd_collection = None

    resume_id = resume_id or session.resume_id
    jd_id = jd_id or session.job_description_id

    if resume_id:
        resume_result = await db.execute(
            select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
        )
        resume = resume_result.scalar_one_or_none()
        if resume:
            resume_collection = resume.chroma_collection_id

    if jd_id:
        jd_result = await db.execute(
            select(JobDescription).where(
                JobDescription.id == jd_id,
                JobDescription.user_id == current_user.id,
            )
        )
        jd = jd_result.scalar_one_or_none()
        if jd:
            jd_collection = jd.chroma_collection_id

    # Save user message
    user_message = ChatMessage(
        session_id=session.id,
        role="user",
        content=payload.message,
    )
    db.add(user_message)
    await db.flush()
    await db.commit()

    # Run RAG pipeline
    try:
        result = await run_rag_chat(
            question=payload.message,
            resume_collection=resume_collection,
            jd_collection=jd_collection,
            chat_history=chat_history,
        )
    except Exception as e:
        err_str = str(e)
        logger.error(f"RAG chat failed: {e}", exc_info=True)
        if "insufficient_quota" in err_str or "429" in err_str or "quota" in err_str.lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "Gemini API quota exceeded or unavailable. "
                    "Please check your Gemini API key/quota and try again."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {err_str}",
        )

    # Save assistant message
    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["answer"],
        sources=json.dumps(result.get("sources", [])),
    )
    db.add(assistant_message)
    await db.flush()
    await db.refresh(assistant_message)

    sources = [
        SourceCitation(
            content=s.get("content", ""),
            source=s.get("source", "document"),
            relevance_score=None,
        )
        for s in result.get("sources", [])
    ]

    return ChatMessageResponse(
        session_id=session.id,
        message_id=assistant_message.id,
        role="assistant",
        content=result["answer"],
        sources=sources,
        created_at=assistant_message.created_at,
    )


@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
    summary="List all chat sessions",
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatSession]:
    """Return all chat sessions for the current user."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    return list(result.scalars().all())


@router.get(
    "/history/{session_id}",
    response_model=ChatHistoryResponse,
    summary="Get chat history for a session",
)
async def get_chat_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatHistoryResponse:
    """Retrieve full message history for a chat session."""
    session_id_str = str(session_id)
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id_str,
            ChatSession.user_id == current_user.id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id_str)
        .order_by(ChatMessage.created_at)
    )
    messages = messages_result.scalars().all()

    return ChatHistoryResponse(
        session_id=session_id,
        messages=[
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "sources": json.loads(msg.sources) if msg.sources else [],
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ],
    )
