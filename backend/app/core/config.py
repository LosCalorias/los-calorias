from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://loscalorias:loscalorias@localhost:5432/loscalorias"
    openai_api_key: str = ""
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    transcription_model: str = "whisper-large-v3-turbo"
    extraction_model: str = "gemini-2.5-flash"
    jwt_secret: str = Field(min_length=32)
    jwt_expire_minutes: int = 7 * 24 * 60


settings = Settings()
