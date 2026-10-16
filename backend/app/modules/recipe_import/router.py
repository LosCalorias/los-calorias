from fastapi import APIRouter, HTTPException, status
from openai import OpenAIError
from app.modules.recipe_import.errors import (
    NoRecipeFoundError,
    RecipeImportError,
    UnsupportedUrlError,
    VideoDownloadError,
    VideoTooLongError,
)
from app.modules.recipe_import.schemas import ImportRequest, RecipeDraft
from app.modules.recipe_import.service import import_recipe

router = APIRouter(prefix="/recipes", tags=["recipes"])

ERROR_MESSAGES: dict[type[RecipeImportError], str] = {
    UnsupportedUrlError: "Підтримуються лише посилання на TikTok або Instagram",
    VideoDownloadError: "Не вдалося завантажити відео. Перевірте посилання",
    VideoTooLongError: "Відео довше 10 хвилин",
    NoRecipeFoundError: "У відео не знайдено рецепта",
}


@router.post("/import", response_model=RecipeDraft)
def import_recipe_from_video(request: ImportRequest) -> RecipeDraft:
    try:
        return import_recipe(str(request.url))
    except RecipeImportError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ERROR_MESSAGES[type(error)],
        ) from error
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервіс розпізнавання тимчасово недоступний",
        ) from error
