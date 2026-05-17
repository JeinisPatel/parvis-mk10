"""Environment-driven settings for the PARVIS Mark 9 backend.

Everything you'd want to vary between dev / staging / prod lives here.
Reads from a `.env` file at the backend root in dev; from real env vars
in production.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="PARVIS_",
        case_sensitive=False,
    )

    app_name: str = "PARVIS Mark 9"
    version:  str = "0.1.0"

    # CORS — list of allowed origins. In prod, lock to the frontend's URL.
    # Comma-separated string in env: PARVIS_CORS_ORIGINS=https://parvis.app
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Auth — Phase A.5. Supabase JWT verification.
    supabase_url:        str | None = None
    supabase_anon_key:   str | None = None
    supabase_jwt_secret: str | None = None



    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        """Accept JSON list or comma-separated string from env vars."""
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                return v
            return [o.strip() for o in s.split(",") if o.strip()]
        return v

settings = Settings()
