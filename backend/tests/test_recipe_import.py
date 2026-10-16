from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from yt_dlp.utils import DownloadError
from app.integrations.openai import client as openai_client
from app.integrations.openai.client import RecipeExtraction
from app.modules.recipe_import import service, video
from app.modules.recipe_import.errors import VideoDownloadError
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


def mock_youtube_dl(monkeypatch: pytest.MonkeyPatch, ydl: MagicMock) -> MagicMock:
    factory = MagicMock()
    factory.return_value.__enter__.return_value = ydl
    monkeypatch.setattr(video.yt_dlp, "YoutubeDL", factory)
    return factory


def test_download_audio_returns_video_data(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    ydl = MagicMock()
    ydl.extract_info.return_value = {
        "description": None,
        "duration": 42,
        "requested_downloads": [{"filepath": str(tmp_path / "123.m4a")}],
    }
    factory = mock_youtube_dl(monkeypatch, ydl)

    data = video.download_audio(TIKTOK_URL, tmp_path)

    assert data == video.VideoData(audio_path=tmp_path / "123.m4a", description="", duration=42.0)
    options = factory.call_args.args[0]
    assert options["format"] == "worstaudio/worst"
    assert options["noplaylist"] is True
    assert options["outtmpl"].startswith(str(tmp_path))
    assert "postprocessors" not in options


def test_download_audio_wraps_download_error(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    ydl = MagicMock()
    ydl.extract_info.side_effect = DownloadError("not found")
    mock_youtube_dl(monkeypatch, ydl)

    with pytest.raises(VideoDownloadError):
        video.download_audio(TIKTOK_URL, tmp_path)


@pytest.mark.parametrize(
    "url",
    [
        "https://www.tiktok.com/@chef/video/123",
        "https://vm.tiktok.com/ZMabc/",
        "https://vt.tiktok.com/ZSabc/",
        "https://tiktok.com/@chef/video/123",
        "https://www.instagram.com/reel/abc/",
        "https://instagram.com/reel/abc/",
    ],
)
def test_supported_urls(url: str) -> None:
    assert service.is_supported_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=abc",
        "https://eviltiktok.com/video/123",
        "https://tiktok.com.evil.com/video/123",
        "ftp://www.tiktok.com/video/123",
    ],
)
def test_unsupported_urls(url: str) -> None:
    assert not service.is_supported_url(url)


def test_import_removes_temp_dir_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    workdirs: list[Path] = []

    def failing_download(url: str, workdir: Path) -> video.VideoData:
        workdirs.append(workdir)
        (workdir / "partial.m4a").write_bytes(b"audio")
        raise VideoDownloadError(url)

    monkeypatch.setattr(service, "download_audio", failing_download)

    with pytest.raises(VideoDownloadError):
        service.import_recipe(TIKTOK_URL)

    assert len(workdirs) == 1
    assert not workdirs[0].exists()
