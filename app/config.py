from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    mongo_uri: str
    jwt_secret: str
    jwt_expires_minutes: int = 10080  # 7 days
    log_level: str = "INFO"
    env: str = "development"
    port: int = 8000
    gemini_api_key: str = ""

    # Telegram notifications
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""      # e.g. "DentelligenceBot" (no @)
    telegram_webhook_secret: str = ""    # optional shared secret for webhook verification

    # Public URL where patients open the portal (used in reminder messages / deep links)
    public_portal_url: str = "http://localhost:5173/portal"

    # Comma-separated list of frontend origins allowed by CORS
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    # Reminder scheduling
    reminder_hours_before: int = 24
    scheduler_interval_minutes: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
