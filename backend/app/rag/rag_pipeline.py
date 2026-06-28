"""
LangChain RAG pipeline — the core AI engine of the Career Copilot.
Handles retrieval, prompt construction, LLM invocation, and source citation.
Supports Google Gemini (primary) and OpenAI GPT-4o (fallback).
"""
import json
import logging
from typing import Any

from langchain.schema import Document

from app.config import get_settings
from app.rag.prompts import (
    COLD_EMAIL_PROMPT,
    COVER_LETTER_PROMPT,
    FOLLOWUP_EMAIL_PROMPT,
    GENERAL_CAREER_PROMPT,
    INTERVIEW_QUESTIONS_PROMPT,
    LINKEDIN_MESSAGE_PROMPT,
    MATCH_ANALYSIS_PROMPT,
)
from app.rag.vector_store import query_similar_chunks

logger = logging.getLogger(__name__)
settings = get_settings()


def get_llm(temperature: float = 0.3):
    """Return Gemini or OpenAI LLM depending on which API key is configured."""
    if settings.google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=temperature,
            google_api_key=settings.google_api_key,
            max_output_tokens=4096,
            convert_system_message_to_human=True,
        )
    # Fallback: OpenAI
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.openai_model,
        temperature=temperature,
        openai_api_key=settings.openai_api_key,
        max_tokens=4096,
    )



def _format_docs(docs: list[Document]) -> str:
    """Format a list of Document chunks into a single context string."""
    if not docs:
        return "No relevant context found."
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", f"chunk_{i}")
        parts.append(f"[Excerpt {i}] (source: {source})\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _extract_sources(docs: list[Document]) -> list[dict[str, Any]]:
    """Extract source citation data from retrieved documents."""
    sources = []
    for doc in docs:
        sources.append({
            "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            "source": doc.metadata.get("source", "document"),
            "source_type": doc.metadata.get("source_type", "unknown"),
            "chunk_index": doc.metadata.get("chunk_index", 0),
        })
    return sources


def _safe_parse_json(raw_text: str) -> dict:
    """
    Safely extract JSON from LLM response.
    Handles cases where the model wraps JSON in markdown code blocks.
    """
    text = raw_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


# ============================================================
# Match Analysis
# ============================================================
async def run_match_analysis(
    resume_collection: str,
    jd_collection: str,
    query: str = "skills experience qualifications requirements",
) -> dict[str, Any]:
    """
    Perform resume-JD match analysis using RAG.

    Returns:
        Parsed dict with match_score, matched_skills, missing_skills, etc.
    """
    # Retrieve relevant chunks
    resume_docs = await query_similar_chunks(query, resume_collection, top_k=6)
    jd_docs = await query_similar_chunks(query, jd_collection, top_k=6)

    resume_context = _format_docs(resume_docs)
    jd_context = _format_docs(jd_docs)

    # Build prompt and invoke LLM
    prompt = MATCH_ANALYSIS_PROMPT.format(
        resume_context=resume_context,
        jd_context=jd_context,
    )

    llm = get_llm(temperature=0.1)
    response = await llm.ainvoke(prompt)
    result = _safe_parse_json(response.content)

    # Attach source citations
    result["sources"] = [s["source"] for s in _extract_sources(resume_docs + jd_docs)]

    logger.info(f"Match analysis complete. Score: {result.get('match_score', 'N/A')}")
    return result


# ============================================================
# RAG Chat
# ============================================================
async def run_rag_chat(
    question: str,
    resume_collection: str | None = None,
    jd_collection: str | None = None,
    chat_history: str = "",
) -> dict[str, Any]:
    """
    Answer a career-related question using RAG over resume and JD.

    Returns:
        Dict with 'answer' and 'sources' list
    """
    # Retrieve relevant context
    resume_docs = []
    jd_docs = []

    if resume_collection:
        resume_docs = await query_similar_chunks(question, resume_collection, top_k=4)
    if jd_collection:
        jd_docs = await query_similar_chunks(question, jd_collection, top_k=3)

    resume_context = _format_docs(resume_docs)
    jd_context = _format_docs(jd_docs) if jd_docs else "No job description provided."

    prompt = GENERAL_CAREER_PROMPT.format(
        resume_context=resume_context,
        jd_context=jd_context,
        chat_history=chat_history or "No previous conversation.",
        question=question,
    )

    llm = get_llm(temperature=0.5)
    response = await llm.ainvoke(prompt)

    return {
        "answer": response.content,
        "sources": _extract_sources(resume_docs + jd_docs),
    }


# ============================================================
# Interview Question Generator
# ============================================================
async def run_interview_generator(
    resume_collection: str,
    jd_collection: str,
    difficulty: str = "intermediate",
    question_count: int = 10,
) -> dict[str, Any]:
    """Generate interview questions at a specified difficulty level."""
    query = "skills experience technical requirements responsibilities"
    resume_docs = await query_similar_chunks(query, resume_collection, top_k=5)
    jd_docs = await query_similar_chunks(query, jd_collection, top_k=5)

    prompt = INTERVIEW_QUESTIONS_PROMPT.format(
        resume_context=_format_docs(resume_docs),
        jd_context=_format_docs(jd_docs),
        difficulty=difficulty,
        question_count=question_count,
    )

    llm = get_llm(temperature=0.4)
    response = await llm.ainvoke(prompt)
    result = _safe_parse_json(response.content)

    # Ensure expected structure
    result.setdefault("technical_questions", [])
    result.setdefault("hr_questions", [])

    return result


# ============================================================
# Cover Letter Generator
# ============================================================
async def run_cover_letter_generator(
    resume_collection: str,
    jd_collection: str,
    tone: str = "professional",
    additional_context: str = "",
) -> dict[str, Any]:
    """Generate a personalized cover letter."""
    resume_docs = await query_similar_chunks(
        "experience skills achievements projects education", resume_collection, top_k=6
    )
    jd_docs = await query_similar_chunks(
        "requirements responsibilities qualifications", jd_collection, top_k=5
    )

    prompt = COVER_LETTER_PROMPT.format(
        resume_context=_format_docs(resume_docs),
        jd_context=_format_docs(jd_docs),
        tone=tone,
        additional_context=additional_context or "None provided",
    )

    llm = get_llm(temperature=0.7)
    response = await llm.ainvoke(prompt)

    cover_letter = response.content.strip()
    return {
        "cover_letter": cover_letter,
        "word_count": len(cover_letter.split()),
        "sources": [s["source"] for s in _extract_sources(resume_docs)],
    }


# ============================================================
# Email Generators
# ============================================================
async def run_cold_email_generator(
    resume_collection: str,
    jd_collection: str | None,
    recipient_name: str = "Hiring Manager",
    company_name: str = "the company",
    additional_context: str = "",
) -> dict[str, Any]:
    """Generate a cold outreach email."""
    resume_docs = await query_similar_chunks(
        "experience skills achievements", resume_collection, top_k=5
    )
    jd_docs = []
    if jd_collection:
        jd_docs = await query_similar_chunks("role requirements", jd_collection, top_k=3)

    prompt = COLD_EMAIL_PROMPT.format(
        resume_context=_format_docs(resume_docs),
        jd_context=_format_docs(jd_docs) if jd_docs else "General job opportunity",
        recipient_name=recipient_name,
        company_name=company_name,
        additional_context=additional_context or "None",
    )

    llm = get_llm(temperature=0.6)
    response = await llm.ainvoke(prompt)
    result = _safe_parse_json(response.content)
    result["word_count"] = len(result.get("body", "").split())
    return result


async def run_linkedin_message_generator(
    resume_collection: str,
    jd_collection: str | None,
    recipient_name: str = "there",
    company_name: str = "your company",
) -> dict[str, Any]:
    """Generate a LinkedIn connection message."""
    resume_docs = await query_similar_chunks("experience role title", resume_collection, top_k=3)
    jd_docs = []
    if jd_collection:
        jd_docs = await query_similar_chunks("role company", jd_collection, top_k=2)

    prompt = LINKEDIN_MESSAGE_PROMPT.format(
        resume_context=_format_docs(resume_docs),
        jd_context=_format_docs(jd_docs) if jd_docs else "General networking",
        recipient_name=recipient_name,
        company_name=company_name,
    )

    llm = get_llm(temperature=0.6)
    response = await llm.ainvoke(prompt)
    result = _safe_parse_json(response.content)
    result["word_count"] = len(result.get("body", "").split())
    return result


async def run_followup_email_generator(
    resume_collection: str,
    jd_collection: str | None,
    recipient_name: str = "Hiring Manager",
    company_name: str = "the company",
    additional_context: str = "",
) -> dict[str, Any]:
    """Generate a follow-up email after interview or application."""
    resume_docs = await query_similar_chunks("experience role", resume_collection, top_k=3)
    jd_docs = []
    if jd_collection:
        jd_docs = await query_similar_chunks("position title", jd_collection, top_k=2)

    prompt = FOLLOWUP_EMAIL_PROMPT.format(
        resume_context=_format_docs(resume_docs),
        jd_context=_format_docs(jd_docs) if jd_docs else "Position applied for",
        recipient_name=recipient_name,
        company_name=company_name,
        additional_context=additional_context or "None",
    )

    llm = get_llm(temperature=0.5)
    response = await llm.ainvoke(prompt)
    result = _safe_parse_json(response.content)
    result["word_count"] = len(result.get("body", "").split())
    return result
