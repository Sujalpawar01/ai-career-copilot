# 🤖 AI Career Copilot

> A **production-ready AI-powered career assistant** that helps you analyze resumes, match job descriptions, generate cover letters, prepare for interviews, and get personalized career guidance — all powered by **OpenAI GPT-4o** and **LangChain RAG**.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-1C3C3C)](https://langchain.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)](https://openai.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-vector%20store-orange)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Resume Parser** | Upload PDF/DOCX — auto-extracted, parsed, and indexed into ChromaDB |
| 💼 **Job Match Analyzer** | Compare resume vs JD with skill match %, gap analysis, and suggestions |
| 🤖 **RAG Chat Assistant** | Ask career questions grounded in your resume and JD context with citations |
| 🎯 **Interview Prep** | Generate technical + HR questions at beginner / intermediate / advanced levels |
| ✉️ **Cover Letter Generator** | Personalized cover letters with professional, enthusiastic, or concise tone |
| 📧 **HR Email Generator** | Cold emails, LinkedIn messages, and follow-up emails |
| 🔐 **JWT Authentication** | Secure user accounts with token-based auth |

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────────┐
                    │         React Frontend            │
                    │   (Vite + Tailwind + Dark Mode)   │
                    └────────────────┬─────────────────┘
                                     │ HTTP / REST
                    ┌────────────────▼─────────────────┐
                    │         FastAPI Backend            │
                    │    (Async + JWT + CORS)            │
                    └──────┬──────────────┬────────────┘
                           │              │
          ┌────────────────▼──┐    ┌──────▼──────────────┐
          │   PostgreSQL DB   │    │  LangChain RAG        │
          │  (Users, Resumes, │    │  Pipeline             │
          │   Jobs, Sessions) │    │  ┌────────────────┐  │
          └───────────────────┘    │  │ OpenAI GPT-4o  │  │
                                   │  │ Embeddings     │  │
                                   │  │ ChromaDB       │  │
                                   │  └────────────────┘  │
                                   └─────────────────────┘
```

### RAG Pipeline Flow

```
Upload → Document Loader → Text Splitter → OpenAI Embeddings
→ ChromaDB Vector Store → Similarity Search (top-k)
→ Prompt Template + Context → GPT-4o → Grounded Response + Citations
```

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async REST API framework
- [LangChain](https://langchain.com/) — RAG orchestration
- [ChromaDB](https://www.trychroma.com/) — vector database
- [PostgreSQL](https://www.postgresql.org/) + [SQLAlchemy](https://sqlalchemy.org/) — relational database
- [OpenAI GPT-4o](https://openai.com/) — LLM & embeddings (`text-embedding-3-small`)
- [python-jose](https://github.com/mpdavis/python-jose) — JWT authentication
- [passlib](https://passlib.readthedocs.io/) — bcrypt password hashing

**Frontend**
- [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) — fast SPA
- [React Router v6](https://reactrouter.com/) — client-side routing
- [Axios](https://axios-http.com/) — HTTP client with JWT interceptors
- [react-dropzone](https://react-dropzone.js.org/) — drag-and-drop file upload
- [react-hot-toast](https://react-hot-toast.com/) — toast notifications
- [lucide-react](https://lucide.dev/) — icons
- Custom CSS design system — dark theme, glassmorphism, micro-animations

**DevOps**
- [Docker](https://docker.com/) + Docker Compose
- [Nginx](https://nginx.org/) — frontend reverse proxy
- [Render](https://render.com/) — cloud deployment

---

## 📁 Project Structure

```
ai-career-copilot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Register / Login / Me
│   │   │   ├── documents.py     # Resume & JD upload/CRUD
│   │   │   ├── analysis.py      # Match analysis endpoint
│   │   │   ├── chat.py          # RAG chat + session history
│   │   │   ├── interview.py     # Interview question generator
│   │   │   ├── cover_letter.py  # Cover letter generator
│   │   │   ├── email_generator.py # Cold/LinkedIn/follow-up emails
│   │   │   └── deps.py          # Shared FastAPI dependencies
│   │   ├── services/
│   │   │   ├── auth_service.py      # JWT + bcrypt
│   │   │   ├── document_parser.py   # PDF/DOCX parsing
│   │   │   └── ingestion_service.py # Orchestrates RAG ingestion
│   │   ├── rag/
│   │   │   ├── embeddings.py    # OpenAI embeddings
│   │   │   ├── vector_store.py  # ChromaDB client
│   │   │   ├── text_splitter.py # RecursiveCharacterTextSplitter
│   │   │   ├── prompts.py       # All 7 prompt templates
│   │   │   └── rag_pipeline.py  # LangChain RAG chains
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic request/response models
│   │   ├── database/
│   │   │   ├── connection.py    # Async SQLAlchemy engine
│   │   │   └── models.py        # ORM models (User, Resume, Job, Chat)
│   │   ├── config.py            # Pydantic settings
│   │   └── main.py              # FastAPI app entry point
│   ├── tests/
│   │   ├── conftest.py          # Pytest fixtures (SQLite)
│   │   ├── test_auth.py         # Auth endpoint tests
│   │   └── test_documents.py    # Document endpoint tests
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ResumeUploadPage.jsx
│   │   │   ├── JobDescriptionPage.jsx
│   │   │   ├── MatchAnalysisPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── InterviewPrepPage.jsx
│   │   │   ├── CoverLetterPage.jsx
│   │   │   └── EmailGeneratorPage.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProtectedLayout.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.jsx       # Auth context + JWT management
│   │   ├── services/
│   │   │   └── api.js            # Axios client + all API functions
│   │   ├── App.jsx               # Router
│   │   ├── main.jsx
│   │   └── index.css             # Complete design system
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── deployment.md            # Render deployment guide
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop (for PostgreSQL + ChromaDB)
- OpenAI API Key

### 1. Clone & Configure

```bash
git clone https://github.com/Sujalpawar01/ai-career-copilot.git
cd ai-career-copilot

# Copy and fill in env vars
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY
```

### 2. Start Services (Docker)

```bash
# Start PostgreSQL + ChromaDB
docker-compose up postgres chromadb -d
```

### 3. Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Run Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### 5. Access the App

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:5173 |
| 🔌 Backend API | http://localhost:8000 |
| 📖 Swagger Docs | http://localhost:8000/docs |
| 📊 ReDoc | http://localhost:8000/redoc |

---

## 🐳 Full Docker Stack

To run everything in Docker (backend + frontend + postgres + chromadb):

```bash
# Copy and fill .env
cp .env.example .env

# Build and start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Swagger: http://localhost:8000/docs
```

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI API key |
| `OPENAI_MODEL` | — | `gpt-4o` | LLM model name |
| `OPENAI_EMBEDDING_MODEL` | — | `text-embedding-3-small` | Embedding model |
| `DATABASE_URL` | ✅ | postgres://... | Async PostgreSQL URL |
| `JWT_SECRET_KEY` | ✅ | — | Long random string for JWT signing |
| `CHROMA_HOST` | — | `localhost` | ChromaDB host |
| `CHROMA_PERSIST_DIR` | — | `./chroma_db` | Local ChromaDB storage path |
| `APP_ENV` | — | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | — | `http://localhost:5173` | CORS allowed origins |

See [`.env.example`](.env.example) for the complete list.

---

## 🧪 Running Tests

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py -v
```

Tests use SQLite in-memory — **no PostgreSQL or ChromaDB required**.

---

## 📖 API Documentation

Full interactive API docs at **http://localhost:8000/docs** (Swagger UI).

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login → JWT token |
| `GET` | `/api/v1/auth/me` | Get current user |
| `POST` | `/api/v1/resume/upload` | Upload PDF/DOCX resume |
| `GET` | `/api/v1/resume` | List user's resumes |
| `POST` | `/api/v1/job` | Submit job description text |
| `POST` | `/api/v1/job/upload` | Upload JD file |
| `POST` | `/api/v1/analyze/match` | Resume-JD match analysis |
| `POST` | `/api/v1/chat/message` | RAG chat message |
| `GET` | `/api/v1/chat/history/{id}` | Chat session history |
| `POST` | `/api/v1/interview/generate` | Generate interview questions |
| `POST` | `/api/v1/cover-letter/generate` | Generate cover letter |
| `POST` | `/api/v1/email/cold` | Cold outreach email |
| `POST` | `/api/v1/email/linkedin` | LinkedIn connection message |
| `POST` | `/api/v1/email/followup` | Follow-up email |

---

## 🚢 Deployment

See the complete **[Render Deployment Guide](docs/deployment.md)** for step-by-step production deployment instructions.

---

## 📋 Database Schema

```
users              resumes              job_descriptions
├── id (UUID)      ├── id (UUID)        ├── id (UUID)
├── email          ├── user_id (FK)     ├── user_id (FK)
├── username       ├── filename         ├── title
├── hashed_pass    ├── file_type        ├── company
├── full_name      ├── parsed_text      ├── raw_text
├── is_active      ├── file_path        ├── match_score
└── created_at     ├── chroma_id        └── chroma_id
                   └── created_at

chat_sessions      chat_messages
├── id (UUID)      ├── id (UUID)
├── user_id (FK)   ├── session_id (FK)
├── resume_id      ├── role (user/assistant)
├── job_id         ├── content
├── title          ├── sources (JSON)
└── created_at     └── created_at
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ using LangChain, FastAPI, React, and OpenAI GPT-4o*

**GitHub**: https://github.com/Sujalpawar01/ai-career-copilot
