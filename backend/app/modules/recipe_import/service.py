import tempfile
from pathlib import Path
from urllib.parse import urlparse
from app.integrations.openai.client import extract_recipe, transcribe
from app.modules.recipe_import.errors import (
    NoRecipeFoundError,
    UnsupportedUrlError,
    VideoTooLongError,
)
from app.modules.recipe_import.schemas import RecipeDraft
from app.modules.recipe_import.video import download_audio

ALLOWED_DOMAINS = ("tiktok.com", "instagram.com")
MAX_DURATION_SECONDS = 600


def is_supported_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https"):
        return False
    return any(host == domain or host.endswith(f".{domain}") for domain in ALLOWED_DOMAINS)


def import_recipe(url: str) -> RecipeDraft:
    if not is_supported_url(url):
        raise UnsupportedUrlError(url)
    with tempfile.TemporaryDirectory() as workdir:
        video = download_audio(url, Path(workdir))
        if video.duration > MAX_DURATION_SECONDS:
            raise VideoTooLongError(url)
        transcript = transcribe(video.audio_path)
    draft = extract_recipe(transcript, video.description, url)
    if draft is None:
        raise NoRecipeFoundError(url)
    return draft
