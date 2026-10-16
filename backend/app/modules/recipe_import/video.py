from dataclasses import dataclass
from pathlib import Path
import yt_dlp
from yt_dlp.utils import DownloadError
from app.modules.recipe_import.errors import VideoDownloadError


@dataclass(frozen=True)
class VideoData:
    audio_path: Path
    description: str
    duration: float


def download_audio(url: str, workdir: Path) -> VideoData:
    options = {
        "format": "worstaudio/worst",
        "outtmpl": str(workdir / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)
            downloads = info.get("requested_downloads") or []
            audio_path = downloads[0]["filepath"] if downloads else ydl.prepare_filename(info)
    except DownloadError as error:
        raise VideoDownloadError(str(error)) from error
    return VideoData(
        audio_path=Path(audio_path),
        description=info.get("description") or "",
        duration=float(info.get("duration") or 0),
    )
