from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import (
    LOGIN_CODE_TTL_SECONDS,
    MAX_LOGIN_CODE_ATTEMPTS,
    REQUEST_CODE_EMAIL_LIMIT,
    REQUEST_CODE_IP_LIMIT,
    REQUEST_CODE_RATE_LIMIT_SECONDS,
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    as_aware_utc,
    generate_login_code,
    generate_session_token,
    hash_secret,
    utc_now,
)
from app.models.auth_identity import AuthIdentity
from app.models.auth_login_code import AuthLoginCode
from app.models.auth_rate_limit import AuthRateLimit
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.auth import AuthLogoutResponse, AuthRequestCodeRequest, AuthRequestCodeResponse, AuthVerifyCodeRequest
from app.schemas.user import UserProfileRead
from app.services.email import EmailDeliveryError, send_login_code_email

router = APIRouter()
logger = logging.getLogger(__name__)


def apply_rate_limit(db: Session, *, scope: str, key: str, limit: int, now) -> None:
    window_start_floor = now - timedelta(seconds=REQUEST_CODE_RATE_LIMIT_SECONDS)
    rate_limit = db.scalar(
        select(AuthRateLimit).where(
            AuthRateLimit.scope == scope,
            AuthRateLimit.key == key,
        )
    )
    if rate_limit is None:
        db.add(AuthRateLimit(scope=scope, key=key, window_start=now, count=1))
        return

    if as_aware_utc(rate_limit.window_start) <= window_start_floor:
        rate_limit.window_start = now
        rate_limit.count = 1
        return

    if rate_limit.count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login code requests. Please try again later.",
        )
    rate_limit.count += 1


@router.post("/request-code", response_model=AuthRequestCodeResponse, response_model_exclude_none=True)
def request_login_code(
    payload: AuthRequestCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthRequestCodeResponse:
    if settings.captcha_required:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="CAPTCHA verification is not configured yet.",
        )

    now = utc_now()
    apply_rate_limit(db, scope="login_code_email", key=payload.email, limit=REQUEST_CODE_EMAIL_LIMIT, now=now)
    if request.client and request.client.host:
        apply_rate_limit(
            db,
            scope="login_code_ip",
            key=request.client.host,
            limit=REQUEST_CODE_IP_LIMIT,
            now=now,
        )

    code = generate_login_code()
    login_code = AuthLoginCode(
        email=payload.email,
        code_hash=hash_secret(code),
        expires_at=now + timedelta(seconds=LOGIN_CODE_TTL_SECONDS),
    )
    db.add(login_code)

    if settings.smtp_enabled:
        try:
            send_login_code_email(payload.email, code)
        except EmailDeliveryError as exc:
            db.rollback()
            logger.warning("Login code email delivery failed for %s", payload.email)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email delivery failed.",
            ) from exc
    elif settings.app_env == "production":
        logger.warning("SMTP is disabled; login code was created but not delivered for %s", payload.email)

    db.commit()

    response = AuthRequestCodeResponse(status="code_created", email=payload.email)
    if settings.app_env != "production":
        response.dev_code = code
    return response


@router.post("/verify-code", response_model=UserProfileRead)
def verify_login_code(
    payload: AuthVerifyCodeRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    now = utc_now()
    login_code = db.scalar(
        select(AuthLoginCode)
        .where(AuthLoginCode.email == payload.email)
        .order_by(AuthLoginCode.created_at.desc(), AuthLoginCode.id.desc())
        .limit(1)
    )

    if login_code is None or login_code.consumed_at is not None or as_aware_utc(login_code.expires_at) <= now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired login code.")

    if login_code.attempts >= MAX_LOGIN_CODE_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many code attempts.")

    if login_code.code_hash != hash_secret(payload.code):
        login_code.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login code.")

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        user = User(email=payload.email)
        db.add(user)
        db.flush()

    identity = db.scalar(
        select(AuthIdentity).where(
            AuthIdentity.provider == "email",
            AuthIdentity.provider_user_id == payload.email,
        )
    )
    if identity is None:
        db.add(
            AuthIdentity(
                user_id=user.id,
                provider="email",
                provider_user_id=payload.email,
                email=payload.email,
            )
        )

    session_token = generate_session_token()
    db.add(
        AuthSession(
            user_id=user.id,
            session_token_hash=hash_secret(session_token),
            expires_at=now + timedelta(seconds=SESSION_TTL_SECONDS),
            last_seen_at=now,
        )
    )
    login_code.consumed_at = now
    db.commit()
    db.refresh(user)

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        path="/",
    )
    return user


@router.post("/logout", response_model=AuthLogoutResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> AuthLogoutResponse:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        session = db.scalar(
            select(AuthSession).where(AuthSession.session_token_hash == hash_secret(session_token))
        )
        if session and session.revoked_at is None:
            session.revoked_at = utc_now()
            db.commit()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        secure=settings.app_env == "production",
        samesite="lax",
    )
    return AuthLogoutResponse(status="logged_out")
