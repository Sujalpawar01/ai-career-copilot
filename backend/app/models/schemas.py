"""
Pydantic schemas for request/response validation.
Organized by domain: Auth, Resume, JobDescription, Chat, Analysis, Interview, Email, CoverLetter
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================
# Auth Schemas
# ============================================================

class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str | None = Field(None, max_length=255)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Resume Schemas
# ============================================================

class ResumeResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    parsed_text: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeUploadResponse(BaseModel):
    message: str
    resume: ResumeResponse


# ============================================================
# Job Description Schemas
# ============================================================

class JobDescriptionTextRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    company: str | None = Field(None, max_length=255)
    raw_text: str = Field(..., min_length=50)


class JobDescriptionResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str | None
    raw_text: str
    match_score: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Analysis Schemas
# ============================================================

class MatchAnalysisRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID


class SkillGap(BaseModel):
    skill: str
    importance: str  # high | medium | low
    suggestion: str


class MatchAnalysisResponse(BaseModel):
    match_score: float = Field(..., ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[SkillGap]
    strengths: list[str]
    improvement_suggestions: list[str]
    overall_assessment: str
    sources: list[str] = []


# ============================================================
# Chat Schemas
# ============================================================

class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID | None = None
    message: str = Field(..., min_length=1, max_length=2000)
    resume_id: uuid.UUID | None = None
    job_description_id: uuid.UUID | None = None


class SourceCitation(BaseModel):
    content: str
    source: str
    relevance_score: float | None = None


class ChatMessageResponse(BaseModel):
    session_id: uuid.UUID
    message_id: uuid.UUID
    role: str
    content: str
    sources: list[SourceCitation] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    session_id: uuid.UUID
    messages: list[dict[str, Any]]


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================
# Interview Schemas
# ============================================================

class InterviewGenerateRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID
    difficulty: str = Field(..., pattern=r"^(beginner|intermediate|advanced)$")
    question_count: int = Field(default=10, ge=3, le=20)
    include_answers: bool = True


class InterviewQuestion(BaseModel):
    question: str
    type: str  # technical | behavioral | hr
    difficulty: str
    model_answer: str | None = None
    tips: list[str] = []


class InterviewPrepResponse(BaseModel):
    difficulty: str
    technical_questions: list[InterviewQuestion]
    hr_questions: list[InterviewQuestion]
    total_questions: int


# ============================================================
# Cover Letter Schemas
# ============================================================

class CoverLetterRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID
    tone: str = Field(default="professional", pattern=r"^(professional|enthusiastic|concise)$")
    additional_context: str | None = Field(None, max_length=500)


class CoverLetterResponse(BaseModel):
    cover_letter: str
    word_count: int
    sources: list[str] = []


# ============================================================
# Email Generator Schemas
# ============================================================

class EmailGenerateRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    recipient_name: str | None = Field(None, max_length=255)
    company_name: str | None = Field(None, max_length=255)
    additional_context: str | None = Field(None, max_length=500)


class EmailResponse(BaseModel):
    subject: str
    body: str
    word_count: int


# ============================================================
# Generic Response Schemas
# ============================================================

class MessageResponse(BaseModel):
    message: str
    detail: str | None = None


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    code: int
