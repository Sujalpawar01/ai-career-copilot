"""
Tests for document upload endpoints.
"""
import io
import pytest


async def _get_auth_header(client, TEST_USER):
    """Helper: register + login and return Bearer header."""
    await client.post("/api/v1/auth/register", json=TEST_USER)
    resp = await client.post("/api/v1/auth/login", json={
        "email": TEST_USER["email"], "password": TEST_USER["password"]
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_list_resumes_empty(client, TEST_USER):
    headers = await _get_auth_header(client, TEST_USER)
    resp = await client.get("/api/v1/resume", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_upload_resume_invalid_type(client, TEST_USER):
    headers = await _get_auth_header(client, TEST_USER)
    fake_file = io.BytesIO(b"this is a text file")
    resp = await client.post(
        "/api/v1/resume/upload",
        files={"file": ("resume.txt", fake_file, "text/plain")},
        headers=headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_job_description(client, TEST_USER):
    headers = await _get_auth_header(client, TEST_USER)
    resp = await client.post("/api/v1/job", json={
        "title": "Senior Software Engineer",
        "company": "Acme Corp",
        "raw_text": "We are looking for a senior software engineer with 5+ years of experience in Python, FastAPI, and cloud technologies. You will design and build scalable APIs.",
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Senior Software Engineer"
    assert data["company"] == "Acme Corp"


@pytest.mark.asyncio
async def test_create_job_description_too_short(client, TEST_USER):
    headers = await _get_auth_header(client, TEST_USER)
    resp = await client.post("/api/v1/job", json={
        "title": "Dev",
        "raw_text": "Too short",  # Under 50 chars
    }, headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_job_descriptions(client, TEST_USER):
    headers = await _get_auth_header(client, TEST_USER)
    await client.post("/api/v1/job", json={
        "title": "ML Engineer",
        "raw_text": "Looking for an experienced machine learning engineer with deep expertise in PyTorch, transformers, and distributed training systems.",
    }, headers=headers)
    resp = await client.get("/api/v1/job", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
