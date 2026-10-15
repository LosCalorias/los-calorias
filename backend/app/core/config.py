from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://loscalorias:loscalorias@localhost:5432/loscalorias"
    openai_api_key: str = ""


settings = Settings()
