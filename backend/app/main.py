from fastapi import FastAPI
from app.modules.auth.router import router as auth_router
from app.modules.nutrition.router import router as nutrition_router
from app.modules.profile.router import router as profile_router
from app.modules.recipe_import.router import router as recipe_import_router
from app.modules.recipes.router import router as recipes_router

app = FastAPI(title="LosCalorías")
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(recipe_import_router)
app.include_router(recipes_router)
app.include_router(nutrition_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
