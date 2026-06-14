"""
Tests for authentication endpoints:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  GET  /api/v1/auth/me
"""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """API health check should return 200."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_register_success(client, TEST_USER):
    resp = await client.post("/api/v1/auth/register", json=TEST_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == TEST_USER["email"]
    assert data["username"] == TEST_USER["username"]
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client, TEST_USER):
    # First registration
    await client.post("/api/v1/auth/register", json=TEST_USER)
    # Second registration with same email
    resp = await client.post("/api/v1/auth/register", json=TEST_USER)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "weak@example.com",
        "username": "weakuser",
        "password": "short",  # Too short, no uppercase, no digit
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client, TEST_USER):
    await client.post("/api/v1/auth/register", json=TEST_USER)
    resp = await client.post("/api/v1/auth/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client, TEST_USER):
    await client.post("/api/v1/auth/register", json=TEST_USER)
    resp = await client.post("/api/v1/auth/login", json={
        "email": TEST_USER["email"],
        "password": "WrongPass999",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client, TEST_USER):
    await client.post("/api/v1/auth/register", json=TEST_USER)
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"],
    })
    token = login_resp.json()["access_token"]
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == TEST_USER["email"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403
