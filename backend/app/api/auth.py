"""Garmin Connect OAuth 2.0 login routes."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import BaseModel

from app.storage import db

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Config ────────────────────────────────────────────────────────────────────

_CLIENT_ID = os.environ.get("GARMIN_CLIENT_ID", "")
_CLIENT_SECRET = os.environ.get("GARMIN_CLIENT_SECRET", "")
_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", secrets.token_hex(32))
_FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

_GARMIN_AUTH_URL = "https://connect.garmin.com/oauth2/authorize"
_GARMIN_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth2/token"
_GARMIN_USER_URL = "https://apis.garmin.com/wellness-api/rest/user/id"

_signer = URLSafeTimedSerializer(_SECRET_KEY, salt="garmin-oauth-state")


# ── Helpers ───────────────────────────────────────────────────────────────────


def _redirect_uri() -> str:
    return f"{_BACKEND_URL}/api/auth/garmin/callback"


def _make_state() -> str:
    return _signer.dumps(secrets.token_hex(16))


def _verify_state(state: str, max_age: int = 600) -> bool:
    try:
        _signer.loads(state, max_age=max_age)
        return True
    except BadSignature:
        return False


def _extract_token(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


# ── Schemas ───────────────────────────────────────────────────────────────────


class UserResponse(BaseModel):
    garmin_user_id: str
    display_name: str


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("/garmin/login")
async def garmin_login() -> RedirectResponse:
    """Redirect the browser to the Garmin Connect authorization page."""
    if not _CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="GARMIN_CLIENT_ID is not configured on this server.",
        )

    params = {
        "client_id": _CLIENT_ID,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": "READ",
        "state": _make_state(),
    }
    return RedirectResponse(f"{_GARMIN_AUTH_URL}?{urlencode(params)}")


@router.get("/garmin/callback")
async def garmin_callback(
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    """Handle the redirect back from Garmin after the user authorises the app."""
    frontend_error_url = f"{_FRONTEND_URL}/login?error="

    if error:
        return RedirectResponse(f"{frontend_error_url}{error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_error_url}missing_params")

    if not _verify_state(state):
        return RedirectResponse(f"{frontend_error_url}invalid_state")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GARMIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _redirect_uri(),
                "client_id": _CLIENT_ID,
                "client_secret": _CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )

    if token_resp.status_code != 200:
        return RedirectResponse(f"{frontend_error_url}token_exchange_failed")

    token_data = token_resp.json()
    access_token: str = token_data.get("access_token", "")
    refresh_token: str = token_data.get("refresh_token", "")
    expires_in: int = int(token_data.get("expires_in", 3600))
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    # Fetch Garmin user ID
    garmin_user_id = "unknown"
    display_name = ""
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            _GARMIN_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    if user_resp.status_code == 200:
        user_data = user_resp.json()
        garmin_user_id = str(user_data.get("userId", user_data.get("id", "unknown")))
        display_name = user_data.get("displayName", user_data.get("username", ""))

    session_token = secrets.token_urlsafe(32)
    db.create_session(
        session_token=session_token,
        garmin_user_id=garmin_user_id,
        display_name=display_name,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )

    return RedirectResponse(f"{_FRONTEND_URL}/login?session={session_token}")


@router.get("/me", response_model=UserResponse)
async def get_me(
    authorization: Annotated[str | None, Header()] = None,
) -> UserResponse:
    """Return the current user based on the Bearer session token."""
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = db.get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or expired")

    return UserResponse(
        garmin_user_id=session["garmin_user_id"],
        display_name=session["display_name"],
    )


@router.post("/logout")
async def logout(
    authorization: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    """Delete the server-side session."""
    token = _extract_token(authorization)
    if token:
        db.delete_session(token)
    return JSONResponse({"ok": True})
