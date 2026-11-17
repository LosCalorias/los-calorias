import pytest
from app.core.config import Settings


@pytest.fixture(autouse=True)
def clear_ai_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "GROQ_API_KEY",
        "GROQ_BASE_URL",
        "GEMINI_API_KEY",
        "GEMINI_BASE_URL",
        "TRANSCRIPTION_MODEL",
        "EXTRACTION_MODEL",
    ):
        monkeypatch.delenv(name, raising=False)


def test_ai_settings_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.groq_api_key == ""
    assert settings.gemini_api_key == ""
    assert settings.groq_base_url == "https://api.groq.com/openai/v1"
    assert settings.gemini_base_url == "https://generativelanguage.googleapis.com/v1beta/openai/"
    assert settings.transcription_model == "whisper-large-v3-turbo"
    assert settings.extraction_model == "gemini-2.5-flash"


def test_ai_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setenv("TRANSCRIPTION_MODEL", "whisper-large-v3")
    monkeypatch.setenv("EXTRACTION_MODEL", "gemini-2.5-flash-lite")

    settings = Settings(_env_file=None)

    assert settings.groq_api_key == "groq-test-key"
    assert settings.gemini_api_key == "gemini-test-key"
    assert settings.transcription_model == "whisper-large-v3"
    assert settings.extraction_model == "gemini-2.5-flash-lite"
