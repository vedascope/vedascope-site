from collections.abc import Generator
import uuid

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import SESSION_COOKIE_NAME, as_aware_utc, hash_secret, utc_now
from app.models.auth_session import AuthSession
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        session = db.scalar(
            select(AuthSession).where(AuthSession.session_token_hash == hash_secret(session_token))
        )
        if session and session.revoked_at is None and as_aware_utc(session.expires_at) > utc_now():
            session.last_seen_at = utc_now()
            db.commit()
            db.refresh(session)
            return session.user

    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header for development user identity.",
        )

    if settings.app_env == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Temporary development identity is disabled in production.",
        )

    try:
        user_id = uuid.UUID(x_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-Id must be a valid UUID.",
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return user
