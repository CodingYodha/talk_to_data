"""
Secure Configuration Management
Centralized settings with validation and fail-fast behavior.
"""

import os
import sys
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """
    Application settings with validation.
    Loads from environment variables and .env file.
    """
    
    # ============ API Keys ============
    # Required - app refuses to start without this
    ANTHROPIC_API_KEY: str
    
    # Optional - for free tier
    GROQ_API_KEY: Optional[str] = None
    
    # ============ Database ============
    # SQLite path (relative to backend folder)
    DATABASE_PATH: str = "chinook.db"
    
    # Optional external database URL (for cloud deployments)
    DATABASE_URL: Optional[str] = None
    
    # ============ Model Configuration ============
    PAID_FLASH_MODEL: str = "claude-haiku-4-5-20251001"
    PAID_PRO_MODEL: str = "claude-sonnet-4-5-20250929"
    FREE_FLASH_MODEL: str = "openai/gpt-oss-20b"
    FREE_PRO_MODEL: str = "openai/gpt-oss-120b"
    
    # ============ Server ============
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # ============ CORS ============
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    @field_validator('DATABASE_URL')
    @classmethod
    def fix_postgres_url(cls, v: Optional[str]) -> Optional[str]:
        """
        Auto-fix cloud Postgres URLs.
        Many cloud providers use 'postgres://' but SQLAlchemy requires 'postgresql://'.
        """
        if v and v.startswith('postgres://'):
            fixed = v.replace('postgres://', 'postgresql://', 1)
            print(f"[CONFIG] Auto-fixed Postgres URL format")
            return fixed
        return v
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]
    
    @property
    def models(self) -> dict:
        """Get model configuration dict."""
        return {
            "paid": {
                "flash": self.PAID_FLASH_MODEL,
                "pro": self.PAID_PRO_MODEL
            },
            "free": {
                "flash": self.FREE_FLASH_MODEL,
                "pro": self.FREE_PRO_MODEL
            }
        }
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Validates on first call and caches for performance.
    """
    return Settings()


def validate_settings_on_startup() -> Settings:
    """
    Validate settings and fail fast if required keys are missing.
    Call this at application startup.
    """
    try:
        settings = get_settings()
        
        # Log successful validation
        print("=" * 50)
        print("[CONFIG] Settings loaded successfully")
        print(f"[CONFIG] Anthropic API Key: {'*' * 8}...{settings.ANTHROPIC_API_KEY[-4:]}")
        print(f"[CONFIG] Groq API Key: {'SET' if settings.GROQ_API_KEY else 'NOT SET'}")
        print(f"[CONFIG] Database: {settings.DATABASE_URL or settings.DATABASE_PATH}")
        print("=" * 50)
        
        return settings
        
    except Exception as e:
        print("=" * 50)
        print("[FATAL] Configuration validation failed!")
        print(f"[FATAL] {str(e)}")
        print("")
        print("Required environment variables:")
        print("  - ANTHROPIC_API_KEY: Your Anthropic API key (REQUIRED)")
        print("")
        print("Optional environment variables:")
        print("  - GROQ_API_KEY: Groq API key for free tier")
        print("  - DATABASE_URL: External database connection string")
        print("=" * 50)
        sys.exit(1)


# Convenience export
settings: Optional[Settings] = None


def init_settings() -> Settings:
    """Initialize and return settings. Call once at startup."""
    global settings
    settings = validate_settings_on_startup()
    return settings
