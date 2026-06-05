# 🤖 AI Career Copilot

> A production-ready AI-powered career assistant that helps you analyze resumes, match job descriptions, generate cover letters, prepare for interviews, and get personalized career guidance — all powered by OpenAI GPT-4o and LangChain RAG.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-latest-1C3C3C?logo=langchain)](https://langchain.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)](https://openai.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-latest-orange)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docker.com/)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Resume Parser** | Upload PDF/DOCX resumes — auto-extracted and indexed |
| 💼 **Job Match Analyzer** | Compare resume vs JD with skill match % and gap analysis |
| 🤖 **RAG Chat Assistant** | Ask anything about your resume, JD, or career path |
| 🎯 **Interview Prep** | Generate technical + HR questions at 3 difficulty levels |
| ✉️ **Cover Letter Generator** | Personalized cover letters from resume + JD context |
| 📧 **HR Email Generator** | Cold emails, LinkedIn messages, follow-up emails |

---

## 🏗️ Architecture

```
Document Upload → Document Loader → Text Splitter → Embeddings
→ ChromaDB Vector Store → Retriever → LangChain RAG Pipeline
→ OpenAI GPT-4o → FastAPI → React Frontend
```

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async REST API
- [LangChain](https://langchain.com/) — RAG orchestration
- [ChromaDB](https://www.trychroma.com/) — vector store
- [PostgreSQL](https://www.postgresql.org/) — relational database
- [SQLAlchemy](https://sqlalchemy.org/) — async ORM
- [OpenAI GPT-4o](https://openai.com/) — LLM + embeddings

**Frontend**
- [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router v6](https://reactrouter.com/)
- [Axios](https://axios-http.com/)

**DevOps**
- [Docker](https://docker.com/) + Docker Compose
- [Render](https://render.com/) — cloud deployment

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop
- OpenAI API Key

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-career-copilot.git
cd ai-career-copilot
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Start with Docker (recommended)
```bash
docker-compose up --build
```

### 4. Manual local setup

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 5. Access the app
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## 📁 Project Structure

```
ai-career-copilot/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── rag/          # LangChain RAG pipeline
│   │   ├── models/       # Pydantic schemas
│   │   ├── database/     # SQLAlchemy models + connection
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Route-level components
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   └── services/     # API client
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔑 Environment Variables

See [`.env.example`](.env.example) for all required variables.

---

## 📖 API Documentation

Once running, visit: **http://localhost:8000/docs**

Key endpoints:
- `POST /auth/register` — Register user
- `POST /auth/login` — Get JWT token
- `POST /resume/upload` — Upload resume
- `POST /job/upload` — Upload job description
- `POST /analyze/match` — Get match analysis
- `POST /chat/message` — RAG chat
- `POST /interview/generate` — Generate interview questions
- `POST /cover-letter/generate` — Generate cover letter
- `POST /email/cold` — Generate cold email

---

## 🚢 Deployment

See [deployment guide](docs/deployment.md) for Render deployment instructions.

---

## 📜 License

MIT License — see [LICENSE](LICENSE)

---

*Built with ❤️ using LangChain, FastAPI, React, and OpenAI*
