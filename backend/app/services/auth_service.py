"""
Authentication service: password hashing, JWT creation/verification.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, extra_data: dict | None = None) -> tuple[str, int]:
    """
    Create a signed JWT access token.

    Args:
        subject: The token subject (typically user email or ID)
        extra_data: Additional claims to embed in the token

    Returns:
        Tuple of (encoded_jwt, expires_in_seconds)
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload: dict = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_data:
        payload.update(extra_data)

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, settings.jwt_access_token_expire_minutes * 60


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Returns:
        The decoded payload dict.

    Raises:
        JWTError: If token is invalid or expired.
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )


def extract_subject(token: str) -> str:
    """Extract the 'sub' claim from a JWT token."""
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise JWTError("Token missing 'sub' claim")
    return sub
