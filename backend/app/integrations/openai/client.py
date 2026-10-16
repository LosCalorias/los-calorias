from pathlib import Path
from openai import OpenAI
from pydantic import BaseModel
from app.core.config import settings
from app.modules.recipe_import.schemas import IngredientDraft, RecipeDraft

TRANSCRIPTION_MODEL = "whisper-1"
EXTRACTION_MODEL = "gpt-4o"

SYSTEM_PROMPT = """\
You extract cooking recipes from short videos. You get the audio transcript and the video \
description; the recipe may be in either of them or split between both.

Rules:
- Set is_recipe to false if the content does not describe how to cook a dish.
- title: the dish name.
- servings: the number of servings if it is stated, otherwise 2.
- ingredients: every ingredient with quantity and unit exactly as stated. Use units \
"g", "ml", "pcs", "tbsp", "tsp", "cup"; use null when the quantity or unit is not stated.
- grams: your estimate of the ingredient weight in grams, or null if it cannot be estimated.
- kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g: typical values per 100 g \
of the raw product; use null if you are not sure.
- steps: short cooking steps in order.
- Write the title, ingredient names and steps in Ukrainian.
- Do not invent ingredients or steps that are not in the transcript or the description.
"""


class RecipeExtraction(BaseModel):
    is_recipe: bool
    title: str
    servings: int
    ingredients: list[IngredientDraft]
    steps: list[str]


def get_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def transcribe(audio_path: Path) -> str:
    with audio_path.open("rb") as audio:
        transcription = get_client().audio.transcriptions.create(
            model=TRANSCRIPTION_MODEL, file=audio
        )
    return transcription.text


def extract_recipe(transcript: str, description: str, source_url: str) -> RecipeDraft | None:
    completion = get_client().chat.completions.parse(
        model=EXTRACTION_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Transcript:\n{transcript}\n\nDescription:\n{description}",
            },
        ],
        response_format=RecipeExtraction,
    )
    extraction = completion.choices[0].message.parsed
    if extraction is None or not extraction.is_recipe:
        return None
    return RecipeDraft(
        title=extraction.title,
        servings=extraction.servings,
        ingredients=extraction.ingredients,
        steps=extraction.steps,
        source_url=source_url,
    )
