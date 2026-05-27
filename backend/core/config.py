import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "Pulmo Rehab API")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("DB_PORT", "3306"))
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "pulmo_rehab")
    database_url: str = os.getenv("DATABASE_URL", "")
    cors_origins: list[str] = None
    ai_summary_enabled: bool = os.getenv("AI_SUMMARY_ENABLED", "false").lower() == "true"
    ai_summary_cron: str = os.getenv("AI_SUMMARY_CRON", "0 0 * * 1")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    def __post_init__(self) -> None:
        origins = os.getenv("CORS_ORIGINS", "*")
        self.cors_origins = _parse_csv(origins) if origins != "*" else ["*"]

        if not self.database_url:
            password = f":{self.db_password}" if self.db_password else ""
            self.database_url = (
                f"mysql+pymysql://{self.db_user}{password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
            )


settings = Settings()
