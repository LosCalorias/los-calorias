from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from app.integrations.openai import client as openai_client
from app.integrations.openai.client import RecipeExtraction
from app.modules.recipe_import.schemas import IngredientDraft

TIKTOK_URL = "https://www.tiktok.com/@chef/video/123"


def make_ingredient() -> IngredientDraft:
    return IngredientDraft(
        name="Борошно",
        quantity=200,
        unit="g",
        grams=200,
        kcal_per_100g=364,
        protein_per_100g=10.3,
        fat_per_100g=1,
        carbs_per_100g=76.3,
    )


def make_extraction(is_recipe: bool) -> RecipeExtraction:
    return RecipeExtraction(
        is_recipe=is_recipe,
        title="Млинці",
        servings=4,
        ingredients=[make_ingredient()],
        steps=["Змішати інгредієнти", "Посмажити"],
    )


@pytest.fixture
def fake_openai(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    fake = MagicMock()
    monkeypatch.setattr(openai_client, "get_client", lambda: fake)
    return fake


def mock_parsed(fake: MagicMock, extraction: RecipeExtraction) -> None:
    message = SimpleNamespace(parsed=extraction)
    fake.chat.completions.parse.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=message)]
    )


def test_transcribe_sends_file_to_whisper(fake_openai: MagicMock, tmp_path: Path) -> None:
    audio_path = tmp_path / "audio.m4a"
    audio_path.write_bytes(b"audio")
    fake_openai.audio.transcriptions.create.return_value = SimpleNamespace(text="hello")

    assert openai_client.transcribe(audio_path) == "hello"
    kwargs = fake_openai.audio.transcriptions.create.call_args.kwargs
    assert kwargs["model"] == "whisper-1"
    assert "language" not in kwargs


def test_extract_recipe_returns_none_when_not_recipe(fake_openai: MagicMock) -> None:
    mock_parsed(fake_openai, make_extraction(is_recipe=False))

    assert openai_client.extract_recipe("text", "", TIKTOK_URL) is None


def test_extract_recipe_returns_draft(fake_openai: MagicMock) -> None:
    mock_parsed(fake_openai, make_extraction(is_recipe=True))

    draft = openai_client.extract_recipe("transcript", "description", TIKTOK_URL)

    assert draft is not None
    assert draft.title == "Млинці"
    assert draft.servings == 4
    assert draft.ingredients == [make_ingredient()]
    assert draft.steps == ["Змішати інгредієнти", "Посмажити"]
    assert draft.source_url == TIKTOK_URL
    kwargs = fake_openai.chat.completions.parse.call_args.kwargs
    assert kwargs["model"] == "gpt-4o"
    assert kwargs["response_format"] is RecipeExtraction
    user_message = kwargs["messages"][1]["content"]
    assert "transcript" in user_message
    assert "description" in user_message
